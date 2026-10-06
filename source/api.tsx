import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {isDeepStrictEqual} from 'node:util';
import {
	install,
	uninstall,
	Browser,
	detectBrowserPlatform,
	getDownloadUrl,
	resolveBuildId,
} from '@puppeteer/browsers';
import puppeteer, {launch, type Page} from 'puppeteer';
import {delay} from 'unicorn-magic';
import {type SpeedData, type SpeedUnit} from './types.js';

type Options = {
	measureUpload?: boolean;
};

async function * monitorSpeed(page: Page, options?: Options): AsyncGenerator<SpeedData, void, undefined> {
	let previousResult: SpeedData | undefined;

	while (true) {
		// eslint-disable-next-line no-await-in-loop, complexity
		const result = await page.evaluate(() => {
			// Puppeteer serializes this callback and runs it inside the page, so `document` is a
			// real global here and cannot be passed in from the Node.js side.
			// eslint-disable-next-line unicorn/isolated-functions
			const $ = (selector: string) => document.querySelector(selector);

			return {
				downloadSpeed: Number($('#speed-value')?.textContent) || 0,
				uploadSpeed: Number($('#upload-value')?.textContent) || 0,
				downloadUnit: ($('#speed-units')?.textContent?.trim() ?? 'Mbps') as SpeedUnit,
				downloaded: Number($('#down-mb-value')?.textContent?.trim()) || 0,
				uploadUnit: ($('#upload-units')?.textContent?.trim() ?? 'Mbps') as SpeedUnit,
				uploaded: Number($('#up-mb-value')?.textContent?.trim()) || 0,
				latency: Number($('#latency-value')?.textContent?.trim()) || 0,
				bufferBloat: Number($('#bufferbloat-value')?.textContent?.trim()) || 0,
				userLocation: $('#user-location')?.textContent?.trim() ?? '',
				serverLocations: $('#server-locations')?.textContent?.split('|').map(location => location.trim()).filter(Boolean) ?? [],
				userIp: $('#user-ip')?.textContent?.trim() ?? '',
				isDone: Boolean($('#speed-value.succeeded') && $('#upload-value.succeeded')),
			};
		});

		if (result.downloadSpeed > 0 && !isDeepStrictEqual(result, previousResult)) {
			yield result;
		}

		if (result.isDone || (options && !options.measureUpload && result.uploadSpeed)) {
			return;
		}

		previousResult = result;

		// eslint-disable-next-line no-await-in-loop
		await delay({seconds: 0.1});
	}
}

/**
Ensures the Chrome build pinned by Puppeteer is available, installing it on demand if needed.

Newer npm versions no longer run install scripts by default, so the browser may not have been downloaded at install time.
*/
async function ensureBrowser(): Promise<void> {
	const configuration = await puppeteer.configuration();

	// A configured browser path is used verbatim by launch, so there is nothing to install in that case.
	// Uses truthiness (not nullish coalescing) to match how launch itself checks the configured path, including treating an empty string as unset.
	// A download opt-out is respected the same way Puppeteer's own install script does, so launch then fails with Puppeteer's usual missing-browser error.
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	if (configuration.executablePath || configuration.skipDownload || configuration.chrome?.skipDownload) {
		return;
	}

	try {
		if (existsSync(await puppeteer.executablePath())) {
			return;
		}
	} catch {
		// A configured version selector may require resolution before Puppeteer can compute its executable path.
	}

	const cacheDir = configuration.cacheDirectory;
	if (!cacheDir) {
		throw new Error('Could not determine the Puppeteer cache directory');
	}

	// `browserVersion` exists at runtime, but is missing from Puppeteer's bundled TypeScript types.
	const unresolvedBuildId = await (puppeteer as typeof puppeteer & {browserVersion(): Promise<string>}).browserVersion();
	const platform = detectBrowserPlatform();
	if (!platform) {
		throw new Error('Could not determine the browser platform');
	}

	const buildId = await resolveBuildId(Browser.CHROME, platform, unresolvedBuildId);
	const options = {
		browser: Browser.CHROME, buildId, cacheDir, platform, baseUrl: configuration.chrome?.downloadBaseUrl,
		buildIdAlias: buildId === unresolvedBuildId ? undefined : unresolvedBuildId,
	};

	// Remove leftovers of an interrupted install (incomplete archive or folder without the executable), which would otherwise fail the install.
	// `uninstall` is a no-op when nothing is installed.
	await uninstall(options);
	const archiveName = path.basename(decodeURIComponent(getDownloadUrl(options.browser, platform, buildId, options.baseUrl).pathname));
	await fs.rm(path.join(cacheDir, options.browser, `${buildId}-${archiveName}`), {force: true});

	process.stderr.write('Downloading Chrome, first run only (~200 MB)...\n');

	await install(options);
}

export default async function * api(options?: Options): AsyncGenerator<SpeedData, void, undefined> {
	await ensureBrowser();

	const browser = await launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
		headless: true,
	});
	const page = await browser.newPage();
	await page.goto('https://fast.com');

	try {
		for await (const result of monitorSpeed(page, options)) {
			yield result;
		}
	} finally {
		await browser.close();
	}
}
