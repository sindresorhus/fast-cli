import {type SpeedUnit} from './types.js';

export const convertToMbps = (value: number, unit: SpeedUnit): number => {
	if (!value) {
		return 0;
	}

	switch (unit) {
		case 'Gbps': {
			return value * 1000;
		}

		case 'Mbps': {
			return value;
		}

		case 'Kbps': {
			return value / 1000;
		}

		case 'Bps': {
			return value / 1_000_000;
		}
	}
};
