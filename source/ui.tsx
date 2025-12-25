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

type VerboseInfoProperties = {
	readonly data: PartialSpeedData;
	readonly singleLine?: boolean;
};

const VerboseInfo: React.FC<VerboseInfoProperties> = ({data, singleLine}) => {
	const hasLatencyData = data.latency !== undefined || data.bufferBloat !== undefined;
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	const hasClientData = Boolean(data.userLocation || data.userIp);

	return (
		<>
			{!singleLine && <Newline/>}
			<Box flexDirection='column'>
				<Box>
					<Text><FixedSpacer size={4}/></Text>
					<Text dimColor>Latency: </Text>
					{hasLatencyData ? (
						<>
							{data.latency !== undefined && (
								<>
									<Text color='white'>{data.latency}</Text>
									<Text dimColor> ms (unloaded)</Text>
								</>
							)}
							{data.latency !== undefined && data.bufferBloat !== undefined && (
								<Text dimColor> / </Text>
							)}
							{data.bufferBloat !== undefined && (
								<>
									<Text color='white'>{data.bufferBloat}</Text>
									<Text dimColor> ms (loaded)</Text>
								</>
							)}
						</>
					) : (
						<Text dimColor>Measuring...</Text>
					)}
				</Box>
				<Box>
					<Text><FixedSpacer size={4}/></Text>
					<Text dimColor>Client: </Text>
					{hasClientData ? (
						<>
							{data.userLocation && (
								<Text color='white'>{data.userLocation}</Text>
							)}
							{data.userLocation && data.userIp && (
								<Text dimColor> • </Text>
							)}
							{data.userIp && (
								<Text color='white'>{data.userIp}</Text>
							)}
						</>
					) : (
						<Text dimColor>Detecting...</Text>
					)}
				</Box>
				<Box>
					<Text><FixedSpacer size={4}/></Text>
					<Text dimColor>Server: </Text>
					{data.serverLocations ? (
						data.serverLocations.map((location, index) => (
							<Text key={location}>
								{index > 0 && <Text dimColor>{' | '}</Text>}
								<Text color='white'>{location}</Text>
							</Text>
						))
					) : (
						<Text dimColor>Detecting...</Text>
					)}
				</Box>
			</Box>

		</>
	);
};

function formatVerboseText(data: PartialSpeedData): string[] {
	const lines: string[] = [];

	if (data.latency !== undefined || data.bufferBloat !== undefined) {
		let latencyLine = 'Latency: ';
		if (data.latency !== undefined) {
			latencyLine += `${data.latency} ms (unloaded)`;
		}

		if (data.latency !== undefined && data.bufferBloat !== undefined) {
			latencyLine += ' / ';
		}

		if (data.bufferBloat !== undefined) {
			latencyLine += `${data.bufferBloat} ms (loaded)`;
		}

		lines.push(latencyLine);
	}

	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	if (data.userLocation || data.userIp) {
		let clientLine = 'Client: ';
		if (data.userLocation) {
			clientLine += data.userLocation;
		}

		if (data.userLocation && data.userIp) {
			clientLine += ' • ';
		}

		if (data.userIp) {
			clientLine += data.userIp;
		}

		lines.push(clientLine);
	}

	if (data.serverLocations?.length) {
		lines.push(`Server: ${data.serverLocations.join(' | ')}`);
	}

	return lines;
}

function createJsonOutput(data: PartialSpeedData, upload: boolean) {
	return {
		downloadSpeed: convertToMbps(data.downloadSpeed ?? 0, data.downloadUnit ?? 'Mbps'),
		uploadSpeed: upload ? convertToMbps(data.uploadSpeed ?? 0, data.uploadUnit ?? 'Mbps') : undefined,
		downloadUnit: 'Mbps' as const,
		uploadUnit: upload ? 'Mbps' as const : undefined,
		downloaded: data.downloaded,
		uploaded: data.uploaded,
		latency: data.latency,
		bufferBloat: data.bufferBloat,
		userLocation: data.userLocation,
		serverLocations: data.serverLocations,
		userIp: data.userIp,
	};
}

function formatTextOutput(data: PartialSpeedData, upload: boolean, verbose: boolean): string {
	let output = `${data.downloadSpeed ?? 0} ${data.downloadUnit ?? 'Mbps'}`;

	if (upload && data.uploadSpeed) {
		output += `\n${data.uploadSpeed} ${data.uploadUnit ?? 'Mbps'}`;
	}

	if (verbose) {
		const verboseLines = formatVerboseText(data);
		if (verboseLines.length > 0) {
			output += '\n\n' + verboseLines.join('\n');
		}
	}

	return output;
}

type FastProperties = {
	readonly singleLine?: boolean;
	readonly upload?: boolean;
	readonly json?: boolean;
	readonly verbose?: boolean;
};

const Ui: React.FC<FastProperties> = ({singleLine, upload, json, verbose}) => {
	const [data, setData] = useState<PartialSpeedData>({});
	const [isDone, setIsDone] = useState(false);
	const {exit} = useApp();
	const {write} = useStdout();

	useEffect(() => {
		(async () => {
			try {
				await dns.lookup('fast.com');
			} catch (error: any) {
				const message = error.code === 'ENOTFOUND'
					? 'Please check your internet connection'
					: 'Failed to connect to fast.com';
				process.stderr.write(message + '\n');
				process.exit(1); // eslint-disable-line unicorn/no-process-exit
			}

			try {
				for await (const result of api({measureUpload: upload})) {
					setData(result);
				}
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
				process.stderr.write(errorMessage + '\n');
				process.exit(1); // eslint-disable-line unicorn/no-process-exit
			}
		})();
	}, [upload]);

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
			const jsonData = createJsonOutput(data, Boolean(upload));
			write(JSON.stringify(jsonData, (_key, value) =>
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				value === undefined ? undefined : value,
				'\t',
			));
		} else if (!process.stdout.isTTY) {
			write(formatTextOutput(data, Boolean(upload), Boolean(verbose)));
		}

		exit();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isDone, exit]);

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
			{verbose && <VerboseInfo data={data} singleLine={singleLine}/>}
			<Spacer singleLine={singleLine}/>
		</>
	);
};

export default Ui;
