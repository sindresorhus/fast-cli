#!/usr/bin/env node
'use strict';
/* eslint-disable prefer-template */
const meow = require('meow');
const chalk = require('chalk');
const logUpdate = require('log-update');
const ora = require('ora');
const api = require('./api');

meow(`
	Usage
	  $ fast
`);

let data = {};

const spinner = ora();
const speed = () => chalk[data.isDone ? 'green' : 'cyan'](data.speed + ' ' + chalk.dim(data.unit)) + '\n';

const exit = () => {
	logUpdate('\n\n    ' + speed());
	process.exit();
};

setInterval(() => {
	const pre = '\n\n  ' + chalk.gray.dim(spinner.frame());

	if (!data.speed) {
		logUpdate(pre + '\n');
		return;
	}

	logUpdate(pre + speed());
}, 50);

api()
	.on('progress', result => {
		data = result;
	})
	.then(() => {
		exit();
	});
