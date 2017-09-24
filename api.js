'use strict';
/* eslint-env browser */
const puppeteer = require('puppeteer');
const Observable = require('zen-observable');

function init(page, browser, observer, prevSpeed) {
	page.evaluate(() => {
		const $ = document.querySelector.bind(document);

		return {
			speed: Number($('#speed-value').textContent),
			unit: $('#speed-units').textContent.trim(),
			isDone: Boolean($('#speed-value.succeeded'))
		};
	})
	.then(result => {
		if (result.speed > 0 && result.speed !== prevSpeed) {
			observer.next(result);
		}

		if (result.isDone) {
			browser.close();
			observer.complete();
		} else {
			setTimeout(init, 100, page, browser, observer, result.speed);
		}
	})
	.catch(err => observer.error(err));
}

module.exports = () => new Observable(observer => {
	puppeteer.launch()
		.then(browser => Promise.all([browser, browser.newPage()]))
		.then(([browser, page]) => Promise.all([browser, page, page.goto('http://fast.com')]))
		.then(([browser, page]) => init(page, browser, observer))
		.catch(err => observer.error(err));
});
