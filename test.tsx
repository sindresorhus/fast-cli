import childProcess from 'node:child_process';
import {once} from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execa} from 'execa';

type JsonOutput = {
	readonly downloadSpeed: number;
	readonly uploadSpeed?: number;
	readonly downloadUnit: string;
	readonly uploadUnit?: string;
	readonly serverLocations: string[];
};

void test('default', async () => {
	const subprocess = childProcess.spawn('node', ['./distribution/cli.js'], {stdio: 'inherit'});
	const [exitCode] = await once(subprocess, 'close') as [unknown, unknown];
	assert.equal(exitCode, 0);
});

void test('non-tty output', async () => {
	const {stdout} = await execa('node', ['./distribution/cli.js'], {timeout: 60_000});
	assert.match(stdout, /^\d+(?:\.\d+)? [BGKM]bps$/v);
});

void test('json output', async () => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--json'], {timeout: 60_000});
	const data = JSON.parse(stdout) as JsonOutput;
	assert.ok(data.downloadSpeed > 0);
	assert.ok(data.downloadUnit.length > 0);
	assert.equal(typeof data.downloadSpeed, 'number');
	assert.match(data.downloadUnit, /^[BGKM]bps$/v);
	assert.ok(Array.isArray(data.serverLocations));
});

void test('upload flag', async () => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--upload'], {timeout: 90_000});
	// Filter out lines that are only escape sequences or empty
	// This and the two other `no-super-linear-move` disables below match the CLI's own stdout,
	// never attacker-controlled input. The fix the rule asks for, a possessive or atomic
	// quantifier, is not in the `v` flag grammar, and bounding the digits would weaken the
	// assertion instead of strengthening it.
	// eslint-disable-next-line regexp/no-super-linear-move
	const lines = stdout.split('\n').filter(line => /\d+(?:\.\d+)?\s+[BGKM]bps/v.test(line));
	assert.equal(lines.length, 2, 'Should output download and upload speeds');
	assert.match(lines[0]!, /^\d+(?:\.\d+)?\s+[BGKM]bps$/v);
	assert.match(lines[1]!, /^\d+(?:\.\d+)?\s+[BGKM]bps$/v);
});

void test('help output', async () => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--help']);
	assert.ok(stdout.includes('Test your download and upload speed'));
	assert.ok(stdout.includes('--upload'));
	assert.ok(stdout.includes('--json'));
});

void test('json upload output', async () => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--upload', '--json'], {timeout: 90_000});
	const data = JSON.parse(stdout) as JsonOutput;
	assert.ok(data.downloadSpeed > 0);
	assert.ok(data.uploadSpeed! > 0);
	assert.equal(data.downloadUnit, 'Mbps');
	assert.equal(data.uploadUnit, 'Mbps');
	assert.equal(typeof data.downloadSpeed, 'number');
	assert.equal(typeof data.uploadSpeed, 'number');
});

void test('verbose flag', async () => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--verbose'], {timeout: 90_000});

	// Should contain speed measurement
	// eslint-disable-next-line regexp/no-super-linear-move
	assert.match(stdout, /\d+(?:\.\d+)?\s+[BGKM]bps/v);

	// Should contain latency information
	assert.match(stdout, /Latency:/v);
	// eslint-disable-next-line regexp/no-super-linear-move
	assert.match(stdout, /\d+\s+ms/v);

	// Should contain client information
	assert.match(stdout, /Client:/v);

	// Should contain server information
	assert.match(stdout, /Server:/v);
});

void test('verbose flag in help', async () => {
	const {stdout} = await execa('node', ['./distribution/cli.js', '--help']);
	assert.ok(stdout.includes('--verbose'));
	assert.ok(stdout.includes('Include latency and server location information'));
});
