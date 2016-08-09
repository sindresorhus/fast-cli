'use strict';
const jsdom = require('jsdom');
const Observable = require('zen-observable');

module.exports = () => new Observable(observer => {
	jsdom.env({
		url: 'http://fast.com/',
		scripts: ['http://code.jquery.com/jquery.js'],
		userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
		strictSSL: false,
		features: {
			FetchExternalResources: ['script'],
			ProcessExternalResources: ['script']
		},
		done: (err, window) => {
			if (err) {
				return observer.error(err);
			}

			let speed;

			const interval = setInterval(() => {
				try {
					const result = {
						speed: Number(window.$('#speed-value').text().trim() || 0),
						unit: window.$('#speed-units').text().trim()
					};

					if (speed !== result.speed) {
						observer.next(result);
						speed = result.speed;
					}

					const isDone = window.$('.succeeded').length > 0;

					if (isDone) {
						clearInterval(interval);
						observer.complete();
					}
				} catch (err) {
					clearInterval(interval);
					observer.error(err);
				}
			}, 100);
		}
	});
});
