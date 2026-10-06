import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {execa} from 'execa';

const provisioningCheck = `
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {mock} from 'node:test';
import * as browsers from '@puppeteer/browsers';
import puppeteer from 'puppeteer';

const configuration = await puppeteer.configuration();
const buildId = await puppeteer.browserVersion();
const platform = browsers.detectBrowserPlatform();
const resolvedBuildId = process.env.TEST_VERSION ? '123.0.6312.0' : buildId;
const downloadUrl = browsers.getDownloadUrl(browsers.Browser.CHROME, platform, resolvedBuildId);
const archivePath = path.join(configuration.cacheDirectory, 'chrome', resolvedBuildId + '-' + path.basename(downloadUrl.pathname));
const installationPath = path.join(configuration.cacheDirectory, 'chrome', platform + '-' + resolvedBuildId);
const unrelatedArchivePath = path.join(configuration.cacheDirectory, 'chrome', 'other-build.zip');
const installationChecked = new Error('installation checked');

if (process.env.TEST_PATH_LOOKUP_FAILURE) {
	mock.method(puppeteer, 'executablePath', async () => {
		throw new Error('Version stable is not a valid Chrome version');
	});
}

if (process.env.TEST_INCOMPLETE_ARCHIVE) {
	await fs.mkdir(installationPath, {recursive: true});
	await fs.writeFile(archivePath, 'truncated zip');
	await fs.writeFile(unrelatedArchivePath, 'keep this archive');
}

mock.module('@puppeteer/browsers', {
	namedExports: {
		...browsers,
		async resolveBuildId(browser, requestedPlatform, selector) {
			assert.equal(browser, browsers.Browser.CHROME);
			assert.equal(requestedPlatform, platform);
			assert.equal(selector, buildId);
			return resolvedBuildId;
		},
		async install(options) {
			assert.equal(process.env.TEST_SKIP_DOWNLOAD, undefined, 'install must not run when downloads are skipped');
			assert.equal(options.buildId, resolvedBuildId, 'install must use the resolved Chrome build');
			assert.equal(options.buildIdAlias, process.env.TEST_VERSION, 'install must preserve the configured selector as an alias');
			if (process.env.TEST_INCOMPLETE_ARCHIVE) {
				assert.equal(existsSync(archivePath), false, 'incomplete archive must be removed before installing');
				assert.equal(existsSync(installationPath), false, 'incomplete installation must be removed');
				assert.equal(existsSync(unrelatedArchivePath), true, 'other builds must be preserved');
			} else {
				assert.equal(options.baseUrl, 'https://mirror.example/chrome', 'configured mirror must be passed to install');
			}

			throw installationChecked;
		},
	},
});

const {default: api} = await import(process.env.TEST_API_PATH);

if (process.env.TEST_SKIP_DOWNLOAD) {
	await assert.rejects(api().next(), /Could not find Chrome/);
} else {
	await assert.rejects(api().next(), error => error === installationChecked);
}
`;

async function checkProvisioning(options: {incompleteArchive?: boolean; configurationFile?: boolean; version?: string; pathLookupFailure?: boolean; skipDownloadVariable?: string} = {}): Promise<number> {
	await fs.mkdir('.ai-temporary', {recursive: true});
	const temporaryDirectory = await fs.mkdtemp(path.resolve('.ai-temporary/browser-test-'));

	try {
		const cacheDirectory = path.join(temporaryDirectory, 'cache');
		const configurationPath = path.join(temporaryDirectory, 'puppeteer.config.cjs');
		await fs.writeFile(configurationPath, `module.exports = ${JSON.stringify({chrome: options.configurationFile ? {downloadBaseUrl: 'https://mirror.example/chrome', version: options.version} : {}})};`);
		const {exitCode} = await execa('node', ['--experimental-test-module-mocks', '--input-type=module', '--eval', provisioningCheck], {
			cwd: temporaryDirectory,
			/* eslint-disable @typescript-eslint/naming-convention -- Environment variable names are part of Puppeteer's external interface. */
			env: {
				PUPPETEER_CACHE_DIR: cacheDirectory,
				PUPPETEER_EXECUTABLE_PATH: '',
				PUPPETEER_BROWSER: 'chrome',
				PUPPETEER_CHROME_DOWNLOAD_BASE_URL: options.configurationFile ? undefined : 'https://mirror.example/chrome',
				PUPPETEER_CHROME_VERSION: options.configurationFile ? undefined : options.version,
				TEST_API_PATH: path.resolve('distribution/api.js'),
				TEST_INCOMPLETE_ARCHIVE: options.incompleteArchive ? '1' : undefined,
				TEST_VERSION: options.version,
				TEST_PATH_LOOKUP_FAILURE: options.pathLookupFailure ? '1' : undefined,
				TEST_SKIP_DOWNLOAD: options.skipDownloadVariable ? '1' : undefined,
				...(options.skipDownloadVariable && {[options.skipDownloadVariable]: 'true'}),
			},
			/* eslint-enable @typescript-eslint/naming-convention */
		});
		return exitCode;
	} finally {
		await fs.rm(temporaryDirectory, {recursive: true, force: true});
	}
}

void test('resolves Chrome selectors when the initial executable path lookup fails', async () => {
	assert.equal(await checkProvisioning({version: 'stable', pathLookupFailure: true}), 0);
});

void test('removes an interrupted Chrome download before reinstalling', async () => {
	assert.equal(await checkProvisioning({incompleteArchive: true}), 0);
});

void test('honors the Chrome download mirror environment variable', async () => {
	assert.equal(await checkProvisioning(), 0);
});

void test('honors the Chrome download mirror configuration', async () => {
	assert.equal(await checkProvisioning({configurationFile: true}), 0);
});

for (const skipDownloadVariable of ['PUPPETEER_SKIP_DOWNLOAD', 'PUPPETEER_CHROME_SKIP_DOWNLOAD']) {
	void test(`does not download Chrome when ${skipDownloadVariable} is set`, async () => {
		assert.equal(await checkProvisioning({skipDownloadVariable}), 0);
	});
}

for (const version of ['stable', '123']) {
	void test(`resolves Chrome selector ${version} from the environment and preserves its alias`, async () => {
		assert.equal(await checkProvisioning({version, incompleteArchive: true}), 0);
	});

	void test(`resolves Chrome selector ${version} from configuration and preserves its alias`, async () => {
		assert.equal(await checkProvisioning({version, configurationFile: true}), 0);
	});
}
