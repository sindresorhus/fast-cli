'use strict';
const {promises: dns} = require('dns');
const React = require('react');
const {useState, useEffect} = require('react');
const {Box, Text, Newline, useApp, useStdout} = require('ink');
const Spinner = require('ink-spinner').default;
const api = require('./api.js');
const {convertToMpbs} = require('./utilities.js');

const FixedSpacer = ({size}) => (
	<>{' '.repeat(size)}</>
);

const ErrorMessage = ({text}) => (
	<Box>
		<Text bold color="red">
			›
			<FixedSpacer size={1}/>
		</Text>
		<Text dimColor>
			{text}
		</Text>
		<Newline count={2}/>
	</Box>
);

const Spacer = ({singleLine}) => {
	if (singleLine) {
		return null;
	}

	return (
		<Text>
			<Newline count={1}/>
		</Text>
	);
};

const DownloadSpeed = ({isDone, downloadSpeed, uploadSpeed, downloadUnit} = {}) => {
	const color = (isDone || uploadSpeed) ? 'green' : 'cyan';

	return (
		<Text color={color}>
			{downloadSpeed}
			<FixedSpacer size={1}/>
			<Text dimColor>{downloadUnit}</Text>
			<FixedSpacer size={1}/>
			↓
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

	return <Text dimColor color={color}>{' - Mbps ↑'}</Text>;
};

const Speed = ({upload, data}) => upload ? (
	<>
		<DownloadSpeed {...data}/>
		<Text dimColor>{' / '}</Text>
		<UploadSpeed {...data}/>
	</>
) : (<DownloadSpeed {...data}/>);

const Fast = ({singleLine, upload, json}) => {
	const [error, setError] = useState('');
	const [data, setData] = useState({});
	const [isDone, setIsDone] = useState(false);
	const {exit} = useApp();
	const {write} = useStdout();

	useEffect(() => {
		(async () => {
			try {
				await dns.lookup('fast.com');
			} catch (error) {
				setError(error.code === 'ENOTFOUND' ?
					'Please check your internet connection' :
					`Something happened ${JSON.stringify(error)}`
				);
				exit();
				return;
			}

			// eslint-disable-next-line unicorn/no-array-for-each
			api({measureUpload: upload}).forEach(result => {
				if (!upload) {
					delete result.uploaded;
					delete result.uploadUnit;
					delete result.uploadSpeed;
				}

				setData(result);
			}).catch(error_ => { // eslint-disable-line promise/prefer-await-to-then
				setError(error_.message);
				exit();
			});
		})();
	}, [exit, upload]);

	useEffect(() => {
		if (data.isDone || (!upload && data.uploadSpeed)) {
			setIsDone(true);
		}
	}, [data.isDone, upload, data.uploadSpeed]);

	useEffect(() => {
		if (isDone) {
			if (json) {
				delete data.isDone;
				data.downloadSpeed = convertToMpbs(data.downloadSpeed, data.downloadUnit);
				delete data.downloadUnit;

				if (upload) {
					data.uploadSpeed = convertToMpbs(data.uploadSpeed, data.uploadUnit);
					delete data.uploadUnit;
				}

				write(JSON.stringify(data, undefined, '\t'));
			}

			exit();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isDone, exit]);

	if (error) {
		return <ErrorMessage text={error}/>;
	}

	if (json) {
		return null;
	}

	return (
		<>
			<Spacer singleLine={singleLine}/>
			<Box>
				{!isDone && (
					<>
						{!singleLine && <Text><FixedSpacer size={2}/></Text>}
						<Text color="cyan"><Spinner/></Text>
						<Text><FixedSpacer size={1}/></Text>
					</>
				)}
				{isDone && <Text><FixedSpacer size={4}/></Text>}
				{Object.keys(data).length > 0 && <Speed upload={upload} data={data}/>}
			</Box>
			<Spacer singleLine={singleLine}/>
		</>
	);
};

module.exports = Fast;
