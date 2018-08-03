#!/usr/bin/env node
'use strict'
const dns = require('dns')
const meow = require('meow')
const chalk = require('chalk')
const logUpdate = require('log-update')
const ora = require('ora')
const api = require('./api')

meow(`
	Usage
	  $ fast
	  $ fast > file
`)

// Check connection
dns.lookup('fast.com', err => {
	if (err && err.code === 'ENOTFOUND') {
		console.error(chalk.red('\n Please check your internet connection.\n'))
		process.exit(1)
	}
})

let data = {}
const spinner = ora()

const speed = () =>
	chalk[data.isDone ? 'green' : 'cyan'](
		data.downloadSpeed + ' ' + chalk.dim(data.unit),
	) + '\n\n'

function exit() {
	if (process.stdout.isTTY) {
		logUpdate(`\n\n    ${speed()}`)
	} else {
		console.log(`${data.downloadSpeed} ${data.unit}`)
	}

	process.exit()
}

if (process.stdout.isTTY) {
	setInterval(() => {
		const pre = '\n\n  ' + chalk.gray.dim(spinner.frame())

		if (!data.downloadSpeed) {
			logUpdate(pre + '\n\n')
			return
		}

		logUpdate(pre + speed())
	}, 50)
}

;(async () => {
	try {
		await api().forEach(result => {
			data = result
		})

		exit()
	} catch (error) {
		console.error(error.message)
		process.exit(1)
	}
})()
