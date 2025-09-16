export type SpeedUnit = 'Gbps' | 'Mbps' | 'Kbps' | 'Bps';

export type SpeedData = {
	readonly downloadSpeed: number;
	readonly uploadSpeed: number;
	readonly downloadUnit: SpeedUnit;
	readonly downloaded: number;
	readonly uploadUnit: SpeedUnit;
	readonly uploaded: number;
	readonly latency: number;
	readonly bufferBloat: number;
	readonly userLocation: string;
	readonly userIp: string;
	readonly isDone: boolean;
};
