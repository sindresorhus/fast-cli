#!/usr/bin/env node
'use strict';
const meow = require('meow');
const importJsx = require('import-jsx');
const React = require('react');
const {render} = require('ink');

// Note to self: This cannot be ESM until https://github.com/vadimdemedes/import-jsx/issues/15 is fixed.

const ui = importJsx('./ui');

const cli = meow(`
	Usage
	  $ fast
	  $ fast > file

	Options
	  --upload, -u   Measure upload speed in addition to download speed
	  --single-line  Reduce spacing and output to a single line
	  --json         JSON output

	Examples
	  $ fast --upload > file && cat file
	  17 Mbps
	  4.4 Mbps

	  $ fast --upload --json
`, {
	flags: {
		upload: {
			type: 'boolean',
			alias: 'u'
		},
		singleLine: {
			type: 'boolean'
		},
		json: {
			type: 'boolean'
		}
	}
});

const main = async () => {
	const app = render(React.createElement(ui, {
		singleLine: cli.flags.singleLine,
		upload: cli.flags.upload,
		json: cli.flags.json
	}));

	await app.waitUntilExit();
};

main();
