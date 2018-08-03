'use strict'
/* eslint-env browser */
const puppeteer = require('puppeteer')
const Observable = require('zen-observable')
const equals = require('deep-equal')

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

async function init(browser, page, observer) {
	let prevResult

	while (true) {
		const result = await page.evaluate(() => {
			const $ = document.querySelector.bind(document)

			return {
				downloadSpeed: Number($('#speed-value').textContent),
				uploadSpeed: Number($('#upload-value').textContent),
				unit: $('#speed-units').textContent.trim(),
				isDone: Boolean(
					$('#speed-value.succeeded') && $('#upload-value.succeeded'),
				),
			}
		})

		if (result.downloadSpeed > 0 && !equals(result, prevResult)) {
			observer.next(result)
		}

		if (result.isDone) {
			browser.close()
			observer.complete()
			return
		}

		delay(100)
	}
}

module.exports = () =>
	new Observable(observer => {
		// Wrapped in async IIFE as `new Observable` can't handle async function
		;(async () => {
			const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
			const page = await browser.newPage()

			await page.goto('https://fast.com')
			await init(browser, page, observer)
		})().catch(observer.error.bind(observer))
	})
