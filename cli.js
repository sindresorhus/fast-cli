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
	  --upload, -u  Measure upload speed in addition to download speed
	  --verbose     Get verbose logging on latency and request metadata

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
		verbose: {
			type: 'boolean'
		}
	}
});

cli.flags.upload = cli.flags.upload || cli.flags.verbose;

// Check connections
dns.lookup('fast.com', error => {
	if (error && error.code === 'ENOTFOUND') {
		console.error(chalk.red('\n Please check your internet connection.\n'));
		process.exit(1);
	}
});

let data = {};
const spinner = ora();

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

const speed = () => speedText() + '\n\n';
const getVerboseLog = () => `   Latency:  ${data.latency}${data.latencyUnit} ${chalk.dim('(unloaded)')}  ${data.bufferbloat}${data.bufferbloatUnit} ${chalk.dim('(loaded)')}\n    Client:  ${data.client.location} ${data.client.ip} ${data.client.isp}\n Server(s):  ${data.serverLocations}`;

function exit() {
	if (process.stdout.isTTY) {
		logUpdate(`\n\n    ${speed()}${cli.flags.verbose ? `\n${getVerboseLog()}` : ''}`);
	} else {
		let output = `${data.downloadSpeed} ${data.downloadUnit}`;

		if (cli.flags.upload) {
			output += `\n${data.uploadSpeed} ${data.uploadUnit}`;
		}

		if (cli.flags.verbose) {
			output += `\n${getVerboseLog()}`;
		}

		console.log(output);
	}

	process.exit();
}

if (process.stdout.isTTY) {
	setInterval(() => {
		const pre = '\n\n  ' + chalk.gray.dim(spinner.frame());

		if (!data.downloadSpeed) {
			logUpdate(pre + '\n\n');
			return;
		}

		logUpdate(pre + speed());
	}, 50);
}

(async () => {
	try {
		await api({measureUpload: cli.flags.upload, verbose: cli.flags.verbose}).forEach(result => {
			data = result;
		});

		exit();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
})();
