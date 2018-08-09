#!/usr/bin/env node
'use strict';
const dns = require('dns');
const meow = require('meow');
const chalk = require('chalk');
const logUpdate = require('log-update');
const ora = require('ora');
const api = require('./api');

meow(`
	Usage
	  $ fast
	  $ fast > file
`);

// Check connection
dns.lookup('fast.com', err => {
	if (err && err.code === 'ENOTFOUND') {
		console.error(chalk.red('\n Please check your internet connection.\n'));
		process.exit(1);
	}
});

let data = {};
const spinner = ora();

const downloadspeed = () => chalk[data.isDone ? 'green' : 'cyan'](data.downloadspeed + ' ' + chalk.dim(data.downloadunit)) + ' Download' + '\n\n';
const uploadspeed = () => chalk[data.isDone ? 'green' : 'cyan'](data.uploadspeed + ' ' + chalk.dim(data.uploadunit)) + ' Upload' + '\n\n';

function exit() {
	if (process.stdout.isTTY) {
		logUpdate(`\n\n    ${downloadspeed()}` + `\n\n    ${uploadspeed()}`);
	} else {
		console.log(`${data.downloadspeed} ${data.downloadunit}`);
	}

	process.exit();
}

if (process.stdout.isTTY) {
	setInterval(() => {
		const pre = '\n\n  ' + chalk.gray.dim(spinner.frame());

		if (!data.downloadspeed) {
			logUpdate(pre + '\n\n');
			return;
		};


		logUpdate(pre + downloadspeed() + pre + uploadspeed());
	}, 50);
}

(async () => {
	try {
		await api().forEach(result => {
			data = result;
		});

		exit();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
})();
