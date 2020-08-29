#!/usr/bin/env node
'use strict';
const dns = require('dns');
const meow = require('meow');
const chalk = require('chalk');
const logUpdate = require('log-update');
const ora = require('ora');
const api = require('./api');

const cli = meow(`
	Usage
	  $ fast
	  $ fast > file

	Options
	  --upload, -u   Measure upload speed in addition to download speed
	  --single-line  Reduce spacing and output to a single line

	Examples
	  $ fast --upload > file && cat file
	  17 Mbps
	  4.4 Mbps
`, {
	flags: {
		upload: {
			type: 'boolean',
			alias: 'u'
		},
		singleLine: {
			type: 'boolean'
		}
	}
});

// Check connections
dns.lookup('fast.com', error => {
	if (error && error.code === 'ENOTFOUND') {
		console.error(
			chalk.red(
				`${lineBreak(1)}${spacing(1)}Please check your internet connection.${lineBreak(1)}`
			)
		);
		process.exit(1);
	}
});

let data = {};
const spinner = ora();

const lineBreak = amount => (cli.flags.singleLine ? '' : '\n'.repeat(amount));
const spacing = amount => (cli.flags.singleLine ? '' : ' '.repeat(amount));

const downloadSpeed = () =>
	`${data.downloadSpeed} ${chalk.dim(data.downloadUnit)} ↓`;

const uploadSpeed = () =>
	data.uploadSpeed ?
		`${data.uploadSpeed} ${chalk.dim(data.uploadUnit)} ↑` :
		chalk.dim('- Mbps ↑');

const uploadColor = string => (data.isDone ? chalk.green(string) : chalk.cyan(string));

const downloadColor = string => ((data.isDone || data.uploadSpeed) ? chalk.green(string) : chalk.cyan(string));

const speedText = () =>
	cli.flags.upload ?
		`${downloadColor(downloadSpeed())} ${chalk.dim('/')} ${uploadColor(uploadSpeed())}` :
		downloadColor(downloadSpeed());

const speed = () => speedText() + lineBreak(2);

function exit() {
	if (process.stdout.isTTY) {
		logUpdate(`${lineBreak(2)}${spacing(4)}${speed()}`);
	} else {
		let output = `${data.downloadSpeed} ${data.downloadUnit}`;

		if (cli.flags.upload) {
			output += `\n${data.uploadSpeed} ${data.uploadUnit}`;
		}

		console.log(output);
	}

	process.exit();
}

if (process.stdout.isTTY) {
	setInterval(() => {
		const pre = lineBreak(2) + spacing(2) + chalk.gray.dim(spinner.frame());

		if (!data.downloadSpeed) {
			logUpdate(pre + lineBreak(2));
			return;
		}

		logUpdate(pre + speed());
	}, 50);
}

(async () => {
	try {
		await api({measureUpload: cli.flags.upload}).forEach(result => {
			data = result;
		});

		exit();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
})();
