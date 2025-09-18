#!/usr/bin/env node
import meow from 'meow';
import {render} from 'ink';
import Ui from './ui.js';

const cli = meow(`
	Usage
	  $ fast
	  $ fast > file

	Options
	  --upload, -u   Measure upload speed in addition to download speed
	  --single-line  Reduce spacing and output to a single line
	  --json         JSON output
	  --verbose      Include latency and server location information

	Examples
	  $ fast --upload > file && cat file
	  17 Mbps
	  4.4 Mbps

	  $ fast --upload --json
`, {
	importMeta: import.meta,
	flags: {
		upload: {
			type: 'boolean',
			shortFlag: 'u',
		},
		singleLine: {
			type: 'boolean',
		},
		json: {
			type: 'boolean',
		},
		verbose: {
			type: 'boolean',
		},
	} as const,
});

function App() {
	return (
		<Ui
			singleLine={cli.flags.singleLine}
			upload={cli.flags.upload || cli.flags.verbose} // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
			json={cli.flags.json}
			verbose={cli.flags.verbose}
		/>
	);
}

const app = render(<App/>);
await app.waitUntilExit();
