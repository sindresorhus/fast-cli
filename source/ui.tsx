import dns from 'node:dns/promises';
import process from 'node:process';
import React, {useState, useEffect} from 'react';
import {
	Box, Text, Newline, useApp, useStdout,
} from 'ink';
import Spinner from 'ink-spinner';
import api from './api.js';
import {convertToMbps} from './utilities.js';
import {type SpeedData} from './types.js';

type SpacerProperties = {
	readonly size: number;
};

const FixedSpacer: React.FC<SpacerProperties> = ({size}) => <>{' '.repeat(size)}</>;

type ErrorMessageProperties = {
	readonly text: string;
};

const ErrorMessage: React.FC<ErrorMessageProperties> = ({text}) => (
	<Box>
		<Text bold color='red'>
			›
			<FixedSpacer size={1}/>
		</Text>
		<Text dimColor>
			{text}
		</Text>
		<Newline count={2}/>
	</Box>
);

type SpeedProperties = {
	readonly singleLine?: boolean;
};

const Spacer: React.FC<SpeedProperties> = ({singleLine}) => (
	singleLine ? null : <Text><Newline count={1}/></Text>
);

type PartialSpeedData = Partial<SpeedData>;

const DownloadSpeed: React.FC<PartialSpeedData> = ({isDone, downloadSpeed, uploadSpeed, downloadUnit}) => {
	const color = (isDone ?? uploadSpeed) ? 'green' : 'cyan';

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

const UploadSpeed: React.FC<PartialSpeedData> = ({isDone, uploadSpeed, uploadUnit}) => {
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

type SpeedComponentProperties = {
	readonly upload?: boolean;
	readonly data: PartialSpeedData;
};

const Speed: React.FC<SpeedComponentProperties> = ({upload, data}) => upload ? (
	<>
		<DownloadSpeed {...data}/>
		<Text dimColor>{' / '}</Text>
		<UploadSpeed {...data}/>
	</>
) : (<DownloadSpeed {...data}/>);

type FastProperties = {
	readonly singleLine?: boolean;
	readonly upload?: boolean;
	readonly json?: boolean;
};

const Ui: React.FC<FastProperties> = ({singleLine, upload, json}) => {
	const [error, setError] = useState('');
	const [data, setData] = useState<PartialSpeedData>({});
	const [isDone, setIsDone] = useState(false);
	const {exit} = useApp();
	const {write} = useStdout();

	useEffect(() => {
		(async () => {
			try {
				await dns.lookup('fast.com');
			} catch (error: any) {
				setError(error.code === 'ENOTFOUND'
					? 'Please check your internet connection'
					: 'Failed to connect to fast.com',
				);
				exit();
				return;
			}

			try {
				for await (const result of api({measureUpload: upload})) {
					setData(result);
				}
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
				setError(errorMessage);
				exit();
			}
		})();
	}, [exit, upload]);

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		if (data.isDone || (!upload && data.uploadSpeed)) {
			setIsDone(true);
		}
	}, [data.isDone, upload, data.uploadSpeed]);

	useEffect(() => {
		if (!isDone) {
			return;
		}

		if (json) {
			const jsonData = {
				downloadSpeed: convertToMbps(data.downloadSpeed ?? 0, data.downloadUnit ?? 'Mbps'),
				uploadSpeed: upload ? convertToMbps(data.uploadSpeed ?? 0, data.uploadUnit ?? 'Mbps') : undefined,
				downloadUnit: 'Mbps' as const,
				uploadUnit: upload ? 'Mbps' as const : undefined,
				downloaded: data.downloaded,
				uploaded: data.uploaded,
				latency: data.latency,
				bufferBloat: data.bufferBloat,
				userLocation: data.userLocation,
				userIp: data.userIp,
			};

			write(JSON.stringify(jsonData, (_key, value) =>
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				value === undefined ? undefined : value,
				'\t',
			));
		} else if (!process.stdout.isTTY) {
			write(`${data.downloadSpeed ?? 0} ${data.downloadUnit ?? 'Mbps'}`);
			if (upload && data.uploadSpeed) {
				write(`\n${data.uploadSpeed} ${data.uploadUnit ?? 'Mbps'}`);
			}
		}

		exit();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isDone, exit]);

	if (error) {
		return <ErrorMessage text={error}/>;
	}

	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	if (json || !process.stdout.isTTY) {
		return null;
	}

	return (
		<>
			<Spacer singleLine={singleLine}/>
			<Box>
				{!isDone && (
					<>
						{!singleLine && <Text><FixedSpacer size={2}/></Text>}
						<Text color='cyan'><Spinner/></Text>
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

export default Ui;
