'use strict';
/* eslint-env browser */
const driver = require('promise-phantom');
const phantomjs = require('phantomjs-prebuilt');

function init(page, cb, prevSpeed) {
	// TODO: doesn't work with arrow function. open issue on `promise-phantom`
	page.evaluate(function () { // eslint-disable-line prefer-arrow-callback
		const $ = document.querySelector.bind(document);

		return {
			speed: Number($('#speed-value').textContent),
			unit: $('#speed-units').textContent.trim(),
			// somehow it didn't work with `Boolean($('#speed-value.succeeded'))`
			isDone: document.querySelectorAll('.succeeded').length > 0
		};
	})
	.then(result => {
		if (result.speed > 0 && result.speed !== prevSpeed) {
			cb(null, result);
		}

		if (result.isDone) {
			page.close();
		} else {
			setTimeout(init, 100, page, cb, result.speed);
		}
	})
	.catch(cb);
}

// TODO: use an event for progress and return a promise for completion
module.exports = cb => {
	driver.create({path: phantomjs.path})
		.then(phantom => phantom.createPage())
		.then(page => page.open('http://fast.com').then(() => {
			init(page, cb);
		}))
		.catch(cb);
};
