#!/usr/bin/env node
'use strict';
/* eslint-disable prefer-template */
const dns = require('dns');
const meow = require('meow');
const chalk = require('chalk');
const logUpdate = require('log-update');
const ora = require('ora');
const api = require('./api');

meow(`
	Usage
	  $ fast
`);

// check connection
dns.lookup('fast.com', err => {
	if (err && err.code === 'ENOTFOUND') {
		console.error(chalk.red('\n Please check you internet connection.\n'));
		process.exit(1);
	}
});

let data = {};
const spinner = ora();

const speed = () => chalk[data.isDone ? 'green' : 'cyan'](data.speed + ' ' + chalk.dim(data.unit)) + '\n\n';

function exit() {
	logUpdate('\n\n    ' + speed());
	process.exit();
}

setInterval(() => {
	const pre = '\n\n  ' + chalk.gray.dim(spinner.frame());

	if (!data.speed) {
		logUpdate(pre + '\n');
		return;
	}

	logUpdate(pre + speed());
}, 50);

let timeout;

api((err, result) => {
	if (err) {
		throw err;
	}

	data = result;

	// exit after the speed has been the same for 3 sec
	// needed as sometimes `isDone` doesn't work for some reason
	clearTimeout(timeout);
	timeout = setTimeout(() => {
		data.isDone = true;
		exit();
	}, 5000);

	if (data.isDone) {
		exit();
	}
});
