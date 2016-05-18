#!/usr/bin/env node
'use strict';
const meow = require('meow');
const updateNotifier = require('update-notifier');
const chalk = require('chalk');
const logUpdate = require('log-update');
const ora = require('ora');
const api = require('./api');

const cli = meow(`
	Usage
	  $ fast
`);

updateNotifier({pkg: cli.pkg}).notify();

let data = {};
const spinner = ora();
const speed = () => chalk[data.isDone ? 'green' : 'cyan'](data.speed + ' ' + chalk.dim(data.unit)) + '\n';

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
	// needed as sometimes `isDone` doens't work for some reason
	clearTimeout(timeout);
	timeout = setTimeout(() => {
		data.isDone = true;
		exit();
	}, 5000);

	if (data.isDone) {
		exit();
	}
});
