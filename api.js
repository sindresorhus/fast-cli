'use strict';
/* eslint-env browser */
const driver = require('promise-phantom');
const phantomjs = require('phantomjs-prebuilt');
const Observable = require('zen-observable');

function init(page, observer, prevSpeed) {
	// TODO: Doesn't work with arrow function. open issue on `promise-phantom`
	page.evaluate(function () { // eslint-disable-line prefer-arrow-callback
		const $ = document.querySelector.bind(document);

		return {
			speed: Number($('#speed-value').textContent),
			unit: $('#speed-units').textContent.trim(),
			// Somehow it didn't work with `Boolean($('#speed-value.succeeded'))`
			isDone: document.querySelectorAll('.succeeded').length > 0
		};
	})
	.then(result => {
		if (result.speed > 0 && result.speed !== prevSpeed) {
			observer.next(result);
		}

		if (result.isDone) {
			page.close();
			observer.complete();
		} else {
			setTimeout(init, 100, page, observer, result.speed);
		}
	})
	.catch(err => observer.error(err));
}

module.exports = () => new Observable(observer => {
	driver.create({path: phantomjs.path})
		.then(phantom => phantom.createPage())
		.then(page => page.open('http://fast.com').then(() => {
			init(page, observer);
		}))
		.catch(err => observer.error(err));
});
