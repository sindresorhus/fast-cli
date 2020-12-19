'use strict';
const dns = require('dns');
const React = require('react');
const {useState, useEffect} = require('react');
const Spinner = require('ink-spinner').default;
const {Box, Text, Newline, useApp} = require('ink');

const api = require('./api');

const ErrorMessage = ({text}) => (
	<Box>
		<Text bold color="red">
			›
		</Text>

		<Text dimColor>
			{text}
		</Text>
		<Newline count={2} />
	</Box>
);

const Spacer = ({singleLine}) => {
	if (singleLine) {
		return null;
	}

	return (
		<Text>
			<Newline count={1} />
		</Text>
	);
};

const DownloadSpeed = ({isDone, downloadSpeed, uploadSpeed, downloadUnit} = {}) => {
	const color = (isDone || uploadSpeed) ? 'green' : 'cyan';

	return (
		<Text color={color}>
			{downloadSpeed}
			{' '}
			<Text dimColor>{downloadUnit}</Text>
			{' '}
			{'↓'}
		</Text>
	);
};

const UploadSpeed = ({isDone, uploadSpeed, uploadUnit} = {}) => {
	const color = isDone ? 'green' : 'cyan';

	if (uploadSpeed) {
		return (
			<Text color={color}>
				{uploadSpeed}
				<Text dimColor>
					{` ${uploadUnit} ↑`}
				</Text>
			</Text>
		);
	}

	return <Text color={color} dimColor>{' - Mbps ↑'}</Text>;
};

const Speed = ({upload, data}) => upload ? (
	<>
		<DownloadSpeed {...data} />
		<Text dimColor>{' / '}</Text>
		<UploadSpeed {...data} />
	</>
) : (<DownloadSpeed {...data} />);

const Fast = ({singleLine, upload}) => {
	const [error, setError] = useState('');
	const [data, setData] = useState({});
	const [isDone, setIsDone] = useState(false);
	const {exit} = useApp();

	useEffect(() => {
		dns.lookup('fast.com', error => {
			if (error && error.code === 'ENOTFOUND') {
				setError('Please check your internet connection');
				exit();
			}
		});
	}, []);

	useEffect(() => {
		api({measureUpload: upload}).forEach(result => {
			setData(result);
		}).catch(() => {
			setError(error.message);
			exit();
		});
	}, []);

	useEffect(() => {
	   if (data.isDone || !upload && data.uploadSpeed) {
			setIsDone(true);
	   }
	}, [data.isDone, upload, data.uploadSpeed]);

	useEffect(() => {
	   if (isDone) {
			exit();
	   }
	}, [isDone]);

	if (error) {
		return <ErrorMessage error={error} />;
	}

	return (
		<>
			<Spacer singleLine={singleLine} />
			<Box>
				{!isDone && (
					<>
						{!singleLine && <Text>{' '}{' '}</Text>}
						<Text color="cyan"><Spinner /></Text>
						<Text>{' '}</Text>
					</>
				)}
				{isDone && <Text>{' '}{' '}{' '}{' '}</Text>}
				{Object.keys(data).length !== 0 && <Speed upload={upload} data={data} />}
			</Box>
			<Spacer singleLine={singleLine} />
		</>
	);
};

module.exports = Fast;
