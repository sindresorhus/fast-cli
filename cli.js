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
	  --verbose      Include info on latency and request metadata

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

const latencyColor = string => (data.isLatencyDone ? chalk.white(string) : chalk.cyan(string));
const bufferbloatColor = string => (data.isBufferbloatDone ? chalk.white(string) : chalk.cyan(string));

const speedText = () =>
	cli.flags.upload ?
		`${downloadColor(downloadSpeed())} ${chalk.dim('/')} ${uploadColor(uploadSpeed())}` :
		downloadColor(downloadSpeed());

const latencyText = () => `Latency:  ${latencyColor(data.latency + data.latencyUnit)} ${chalk.dim('(unloaded)')}  ${bufferbloatColor(data.bufferbloat + data.bufferbloatUnit)} ${chalk.dim('(loaded)')}`;

const speed = () => {
	let speedLog = speedText() + lineBreak(2);
	if (cli.flags.verbose) {
		speedLog += `${cli.flags.singleLine ? '\n' : ''}${spacing(4)}${latencyText()}\n`;
	}

	return speedLog;
};

const getVerboseLog = () => `${spacing(4)}${latencyText()}\n${spacing(5)}Client:  ${data.client.location} ${data.client.ip} ${data.client.isp}\n${spacing(4)}Servers:  ${data.serverLocations}`;

function exit() {
	if (process.stdout.isTTY) {
		logUpdate(`${lineBreak(2)}${spacing(4)}${speed()}${cli.flags.verbose ? `${lineBreak(1)}${getVerboseLog()}` : ''}`);
	} else {
		let output = `${data.downloadSpeed} ${data.downloadUnit}`;

		if (cli.flags.upload) {
			output += `${cli.flags.singleLine ? ' / ' : '\n'}${data.uploadSpeed} ${data.uploadUnit}`;
		}

		output += "\n"

		if (cli.flags.verbose) {
			output += `\n${getVerboseLog()}`;
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
		await api({measureUpload: cli.flags.upload, verbose: cli.flags.verbose}).forEach(result => {
			data = result;
		});

		exit();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
})();
