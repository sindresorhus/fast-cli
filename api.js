'use strict';
/* eslint-env browser */
const puppeteer = require('puppeteer');
const Observable = require('zen-observable');

async function init(browser, page, observer, prevSpeed) {
	const result = await page.evaluate(() => {
		const $ = document.querySelector.bind(document);

		return {
			speed: Number($('#speed-value').textContent),
			unit: $('#speed-units').textContent.trim(),
			isDone: Boolean($('#speed-value.succeeded'))
		};
	});

	if (result.speed > 0 && result.speed !== prevSpeed) {
		observer.next(result);
	}

	if (result.isDone) {
		browser.close();
		observer.complete();
	} else {
		setTimeout(init, 100, browser, page, observer, result.speed);
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
