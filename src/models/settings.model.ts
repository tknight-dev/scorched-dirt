/**
 * @author tknight-dev
 */

export enum FPS {
	_30 = 30,
	_40 = 40,
	_60 = 60,
	_120 = 120,
	_144 = 144,
	unlimited = 0,
}

export type MapSize = 320 | 640 | 1280 | 1920 | 2560;

export type ResolutionWidthPx = undefined | 320 | 640 | 1280 | 1920 | 2560;
