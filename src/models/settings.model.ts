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

export type WorldSize = 320 | 640 | 1280 | 1920 | 2560;

export type ResolutionWidthPx = undefined | 320 | 640 | 1280 | 1920 | 2560;

export enum WindStrength {
	BREEZY = 2,
	CALM = 1,
	NONE = 0,
	STORM = 4,
	TORNADO = 5,
	WINDY = 3,
}
