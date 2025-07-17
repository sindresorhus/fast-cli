import dns from 'node:dns/promises';
import React, {useState, useEffect} from 'react';
import {
	Box, Text, Newline, useApp, useStdout,
} from 'ink';
import Spinner from 'ink-spinner';
import api from './api.js';
import {convertToMbps} from './utilities.js';
import {type SpeedUnit} from './types.js';

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

const Spacer: React.FC<SpeedProperties> = ({singleLine}) => {
	if (singleLine) {
		return null;
	}

	return (
		<Text>
			<Newline count={1}/>
		</Text>
	);
};

type SpeedData = {
	readonly isDone?: boolean;
	readonly downloadSpeed?: number;
	readonly uploadSpeed?: number;
	readonly downloadUnit?: SpeedUnit;
	readonly uploadUnit?: SpeedUnit;
};

type DownloadSpeedProperties = SpeedData;

const DownloadSpeed: React.FC<DownloadSpeedProperties> = ({isDone, downloadSpeed, uploadSpeed, downloadUnit}) => {
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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

type UploadSpeedProperties = SpeedData;

const UploadSpeed: React.FC<UploadSpeedProperties> = ({isDone, uploadSpeed, uploadUnit}) => {
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
	readonly data: SpeedData;
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
	const [data, setData] = useState<SpeedData>({});
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
					: `Something happened ${JSON.stringify(error)}`,
				);

				exit();

				return;
			}

			try {
				for await (const result of api({measureUpload: upload})) {
					// @ts-expect-error - Don't have time to look into it.
					setData(result);
				}
			} catch (error: unknown) {
				// eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
				setError((error as Error).message ?? `${error ?? '<Unknown error>'}`);
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
				...data,
				downloadSpeed: convertToMbps(data.downloadSpeed!, data.downloadUnit!),
				uploadSpeed: upload ? convertToMbps(data.uploadSpeed!, data.uploadUnit!) : undefined,
				downloadUnit: undefined,
				uploadUnit: upload ? data.uploadUnit : undefined,
				isDone: undefined, // Explicitly omit 'isDone'
			};

			write(JSON.stringify(jsonData, (_key, value) =>
				// Exclude keys with undefined values from serialization.
				value === undefined ? undefined : value, // eslint-disable-line @typescript-eslint/no-unsafe-return
			'\t',
			));
		}

		exit();
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
