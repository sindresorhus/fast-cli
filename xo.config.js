import xoReact from 'eslint-config-xo-react';

const xoConfig = [
	...xoReact(),
	{
		rules: {
			// The speed scraping and output formatting use plain truthiness checks on numbers
			// and strings throughout. Rewriting those conditions is a behaviour change, not
			// part of the Node.js 22 migration, so the rule stays off.
			'@typescript-eslint/strict-boolean-expressions': 'off',
		},
	},
];

export default xoConfig;
