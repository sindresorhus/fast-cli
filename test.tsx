import childProcess from 'node:child_process';
import {execa} from 'execa';
import {pEvent} from 'p-event';
import test from 'ava';

test('default', async t => {
	const subprocess = childProcess.spawn('node', ['./distribution/cli.js'], {stdio: 'inherit'});
	t.is(await pEvent(subprocess, 'close'), 0);
});

test('non-tty output', async t => {
	const {stdout} = await execa('node', ['./distribution/cli.js'], {timeout: 60_000});
	t.regex(stdout, /^\d+(?:\.\d+)? [MGKB]bps$/);
});

test('json output', async t => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--json'], {timeout: 60_000});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const data = JSON.parse(stdout);
	t.truthy(data.downloadSpeed);
	t.truthy(data.downloadUnit);
	t.is(typeof data.downloadSpeed, 'number');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	t.regex(data.downloadUnit, /^[MGKB]bps$/);
});

test('upload flag', async t => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--upload'], {timeout: 90_000});
	// Filter out lines that are only escape sequences or empty
	const lines = stdout.split('\n').filter(line => /\d+(?:\.\d+)?\s+[MGKB]bps/.test(line));
	t.is(lines.length, 2, 'Should output download and upload speeds');
	t.regex(lines[0], /^\d+(?:\.\d+)?\s+[MGKB]bps$/);
	t.regex(lines[1], /^\d+(?:\.\d+)?\s+[MGKB]bps$/);
});

test('help output', async t => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--help']);
	t.true(stdout.includes('Test your download and upload speed'));
	t.true(stdout.includes('--upload'));
	t.true(stdout.includes('--json'));
});

test('json upload output', async t => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--upload', '--json'], {timeout: 90_000});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const data = JSON.parse(stdout);
	t.truthy(data.downloadSpeed);
	t.truthy(data.uploadSpeed);
	t.is(data.downloadUnit, 'Mbps');
	t.is(data.uploadUnit, 'Mbps');
	t.is(typeof data.downloadSpeed, 'number');
	t.is(typeof data.uploadSpeed, 'number');
});
