'use strict';
/* eslint-env browser */
const puppeteer = require('puppeteer');
const Observable = require('zen-observable');
const equals = require('deep-equal'); // TODO: Use `util.isDeepStrictEqual` when targeting Node.js 10
const delay = require('delay');

async function init(browser, page, observer, options) {
	let prevResult;

	/* eslint-disable no-constant-condition, no-await-in-loop */
	while (true) {
		const result = await page.evaluate(() => {
			const $ = document.querySelector.bind(document);

			return {
				downloadSpeed: Number($('#speed-value').textContent),
				downloadUnit: $('#speed-units').textContent.trim(),
				downloaded: Number($('#down-mb-value').textContent.trim()),
				uploadSpeed: Number($('#upload-value').textContent),
				uploadUnit: $('#upload-units').textContent.trim(),
				uploaded: Number($('#up-mb-value').textContent.trim()),
				latency: Number($('#latency-value').textContent.trim()),
				bufferBloat: Number($('#bufferbloat-value').textContent.trim()),
				userLocation: $('#user-location').textContent.trim(),
				userIp: $('#user-ip').textContent.trim(),
				isDone: Boolean(
					$('#speed-value.succeeded') && $('#upload-value.succeeded')
				)
			};
		});

		if (result.downloadSpeed > 0 && !equals(result, prevResult)) {
			observer.next(result);
		}

		if (result.isDone || (options && !options.measureUpload && result.uploadSpeed)) {
			browser.close();
			observer.complete();
			return;
		}

		prevResult = result;

		await delay(100);
	}
	/* eslint-enable no-constant-condition, no-await-in-loop */
}

module.exports = options => (
	new Observable(observer => {
		// Wrapped in async IIFE as `new Observable` can't handle async function
		(async () => {
			const browser = await puppeteer.launch({args: ['--no-sandbox']});
			const page = await browser.newPage();
			await page.goto('https://fast.com');
			await init(browser, page, observer, options);
		})().catch(observer.error.bind(observer));
	})
);
