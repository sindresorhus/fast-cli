import {isDeepStrictEqual} from 'node:util';
import puppeteer from 'puppeteer';
import {delay} from 'unicorn-magic';

type Options = {
	measureUpload?: boolean;
};

type Result = {
	downloadSpeed: number;
	uploadSpeed: number;
	downloadUnit: string;
	downloaded: number;
	uploadUnit: string;
	uploaded: number;
	latency: number;
	bufferBloat: number;
	userLocation: string;
	userIp: string;
	isDone: boolean;
};

async function * monitorSpeed(page: puppeteer.Page, options?: Options): AsyncGenerator<Result, void, undefined> {
	let previousResult: Result | undefined;

	while (true) {
		// eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-loop-func
		const result: Result = await page.evaluate((): Result => {
			const $ = document.querySelector.bind(document);

			return {
				downloadSpeed: Number($('#speed-value')?.textContent),
				uploadSpeed: Number($('#upload-value')?.textContent),
				downloadUnit: $('#speed-units')?.textContent?.trim()!,
				downloaded: Number($('#down-mb-value')?.textContent?.trim()),
				uploadUnit: $('#upload-units')?.textContent?.trim()!,
				uploaded: Number($('#up-mb-value')?.textContent?.trim()),
				latency: Number($('#latency-value')?.textContent?.trim()),
				bufferBloat: Number($('#bufferbloat-value')?.textContent?.trim()),
				userLocation: $('#user-location')?.textContent?.trim()!,
				userIp: $('#user-ip')?.textContent?.trim()!,
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

export default async function * api(options?: Options): AsyncGenerator<Result, void, undefined> {
	const browser = await puppeteer.launch({args: ['--no-sandbox']});
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
