'use strict';
/* eslint-env browser */
const EventEmitter = require('events');
const driver = require('promise-phantom');
const phantomjs = require('phantomjs-prebuilt');

const init = (emitter, page, prevSpeed) => {
	// TODO: doesn't work with arrow function. open issue on `promise-phantom`
	return page.evaluate(function () { // eslint-disable-line
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
			emitter.emit('progress', result);
		}

		if (result.isDone) {
			page.close();
			return result;
		}

		return init(emitter, page, result.speed);
	});
};

module.exports = () => {
	const emitter = new EventEmitter();
	const promise = driver.create({path: phantomjs.path})
		.then(phantom => phantom.createPage())
		.then(page => page.open('http://fast.com').then(() => init(emitter, page)));

	emitter.then = promise.then.bind(promise);
	emitter.catch = promise.catch.bind(promise);

	return emitter;
};
