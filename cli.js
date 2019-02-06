#!/usr/bin/env node
"use strict";
const dns = require("dns");
const meow = require("meow");
const chalk = require("chalk");
const logUpdate = require("log-update");
const ora = require("ora");
const api = require("./api");

const cli = meow(`
	Usage
		$ fast
		$ fast > file
		$ fast --verbose
`);

// Check connections
dns.lookup("fast.com", err => {
	if (err && err.code === "ENOTFOUND") {
		console.error(chalk.red("\n Please check your internet connection.\n"));
		process.exit(1);
	}
});

let data = {};
const spinner = ora();

const downloadSpeed = () =>
	`${data.downloadSpeed} ${chalk.dim(data.downloadUnit)} ↓`;

const uploadSpeed = () =>
	data.uploadSpeed
		? `${data.uploadSpeed} ${chalk.dim(data.uploadUnit)} ↑`
		: chalk.dim("- Mbps ↑");

const color = s => (data.isDone ? chalk.green(s) : chalk.cyan(s));

const speedText = () =>
	cli.flags.verbose
		? `${color(downloadSpeed())} ${chalk.dim("/")} ${color(uploadSpeed())}`
		: color(downloadSpeed());

const speed = () => speedText() + "\n\n";

function exit() {
	if (process.stdout.isTTY) {
		logUpdate(`\n\n    ${speed()}`);
	} else if (cli.flags.verbose) {
		console.log(
			`${data.downloadSpeed} ${data.downloadUnit} / ${data.uploadSpeed} ${data.uploadUnit}`
		);
	} else {
		console.log(`${data.downloadSpeed} ${data.downloadUnit}`);
	}

	process.exit();
}

if (process.stdout.isTTY) {
	setInterval(() => {
		const pre = "\n\n  " + chalk.gray.dim(spinner.frame());

		if (!data.downloadSpeed) {
			logUpdate(pre + "\n\n");
			return;
		}

		logUpdate(pre + speed());
	}, 50);
}

(async () => {
	try {
		await api({ measureUpload: cli.flags.verbose }).forEach(result => {
			data = result;
		});

		exit();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
})();
