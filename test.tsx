import childProcess from 'node:child_process';
import {execa} from 'execa';
import {pEvent} from 'p-event';
import test from 'ava';

test('default', async t => {
	const subprocess = childProcess.spawn('node', ['./distribution/cli.js'], {stdio: 'inherit'});
	t.is(await pEvent(subprocess, 'close'), 0);
});

test('non-tty', async t => {
	const {stdout} = await execa('node', ['./distribution/cli.js']);
	t.regex(stdout, /\d+(?:\.\d+)? \w+/i);
});
