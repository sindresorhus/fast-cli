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

	Examples
	  $ fast --upload > file && cat file
	  17 Mbps
	  4.4 Mbps
`, {
	flags: {
		upload: {
			type: 'boolean',
			alias: 'u'
		}
	}
});

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

const latency = () =>
	data.latencyValue ?
		`\n\nLatency - { Unloaded - ${data.latencyValue} ${chalk.dim('ms')} Loaded - ${data.bufferBloatValue} ${chalk.dim('ms')} }` :
		`\n\n` + chalk.dim(`Latency - { Unloaded - 0 ms Loaded - 0 ms }`)

const client = () =>
	data.userLocationValue ?
		`\n\n Client - ${data.userLocationValue} ${data.userIPValue} ${data.userISPValue}` :
		`\n\n` + chalk.dim(`Client`)

const server = () =>
	data.serverLocations ?
		`\n\n Server(s) - ${data.serverLocations}` :
		`\n\n` + chalk.dim(`Server(s)`)

const uploadColor = string => ((data.isDone || data.uploadSpeed) ? chalk.green(string) : chalk.cyan(string));

const downloadColor = string => ((data.isDone || data.uploadSpeed) ? chalk.green(string) : chalk.cyan(string));

const latencyColor = string => ((data.isDone || data.latencyValue) ? chalk.green(string) : chalk.magenta(string));

const speedTextUpload = () =>
	cli.flags.upload ?
		`${downloadColor(downloadSpeed())} ${chalk.dim('/')} ${uploadColor(uploadSpeed())}` :
		downloadColor(downloadSpeed());

const speedTextVerbose = () =>
	cli.flags.verbose ?
		` ${chalk.dim('/')} ${uploadColor(uploadSpeed())} ${latencyColor(latency())} ${uploadColor(client())} ${downloadColor(server())}` :
		``

const speed = () => speedTextUpload() + speedTextVerbose() + '\n\n';

function exit() {
	if (process.stdout.isTTY) {
		logUpdate(`\n\n    ${speed()}`);
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
		await api({measureUpload: cli.flags.upload}).forEach(result => {
			data = result;
		});

		exit();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
})();