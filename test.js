import childProcess from 'child_process';
import execa from 'execa';
import test from 'ava';

test.cb('default', t => {
	// TODO: Use `execa` here when the `spawn` API is done
	const cp = childProcess.spawn('./cli.js', {stdio: 'inherit'});

	cp.on('error', t.fail);

	cp.on('close', code => {
		t.is(code, 0);
		t.end();
	});
});

test('non-tty', async t => {
	t.regex(await execa.stdout('./cli.js'), /^\d+(?:\.\d+)? \w+$/i);
});
