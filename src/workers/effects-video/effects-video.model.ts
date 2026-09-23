import { FPS } from '../../models/settings.model.js';
import { GamingCanvasRenderStyle, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { World } from '../../models/world.model.js';

/**
 * @author tknight-dev
 */

/*
 * Stats
 */
export enum WorkerEffectsVideoBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerEffectsVideoBusInputCmd {
	CALC,
	CALC_HEIGHT_MAPS,
	INIT,
	REPORT,
	SETTINGS,
	VIEW,
	WORLD,
}

export interface WorkerEffectsVideoBusInputDataCalc {
	splashes?: Uint32Array;
}

export interface WorkerEffectsVideoBusInputDataCalcHeightMaps {
	heightMapGrid?: Uint32Array;
	heightMapParticles?: Uint32Array;
}

export interface WorkerEffectsVideoBusInputDataInit extends WorkerEffectsVideoBusInputDataSettings, WorkerEffectsVideoBusInputDataView {
	offscreenCanvas: OffscreenCanvas;
	report: GamingCanvasReport;
	world: World;
}

export interface WorkerEffectsVideoBusInputDataSettings {
	debug: boolean;
	fps: FPS;
	gammaCorrection: number;
	grayscale: boolean;
	renderStyle: GamingCanvasRenderStyle;
}

export interface WorkerEffectsVideoBusInputDataView {
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
}

export interface WorkerEffectsVideoBusInputPayload {
	cmd: WorkerEffectsVideoBusInputCmd;
	data:
		| GamingCanvasReport
		| Uint32Array
		| WorkerEffectsVideoBusInputDataCalc
		| WorkerEffectsVideoBusInputDataCalcHeightMaps
		| WorkerEffectsVideoBusInputDataInit
		| WorkerEffectsVideoBusInputDataSettings
		| WorkerEffectsVideoBusInputDataView
		| World;
}

/*
 * Output
 */
export enum WorkerEffectsVideoBusOutputCmd {
	INIT_COMPLETE,
	STATS,
}

export interface WorkerEffectsVideoBusOutputDataStats {
	all: Float32Array;
	fps: number;
}

export interface WorkerEffectsVideoBusOutputPayload {
	cmd: WorkerEffectsVideoBusOutputCmd;
	data: boolean | WorkerEffectsVideoBusOutputDataStats;
}
