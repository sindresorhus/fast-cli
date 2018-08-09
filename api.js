'use strict';
/* eslint-env browser */
const puppeteer = require('puppeteer');
const Observable = require('zen-observable');

async function init(browser, page, observer, prevSpeed) {
	const result = await page.evaluate(() => {
		const $ = document.querySelector.bind(document);

		return {
			downloadspeed: Number($('#speed-value').textContent),
			downloadunit: $('#speed-units').textContent.trim(),
			uploadspeed: Number($('#upload-value').textContent),
			uploadunit: $('#upload-units').textContent.trim(),

			isDone: Boolean($('#upload-value.succeeded'))
		};
	});

	if (result.uploadspeed > 0 && result.uploadunit !== prevSpeed) {
		observer.next(result);
	}

	if (result.isDone) {
		browser.close();
		observer.complete();
	} else {
		setTimeout(init, 100, browser, page, observer, result.downloadspeed, result.uploadspeed);
	}
}

module.exports = () => new Observable(observer => {
	// Wrapped in async IIFE as `new Observable` can't handle async function
	(async () => {
		const browser = await puppeteer.launch({args: ['--no-sandbox']});
		const page = await browser.newPage();

		await page.goto('https://fast.com');
		await init(browser, page, observer);
	})().catch(observer.error.bind(observer));
});
