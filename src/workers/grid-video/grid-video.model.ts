import { FPS } from '../../models/settings.model.js';
import { GamingCanvasRenderStyle, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { World } from '../../models/world.model.js';
import { GamingCanvasGridUint32Array } from '../../gaming-canvas/modules/grid/grid.js';

/**
 * @author tknight-dev
 */

/*
 * Stats
 */
export enum WorkerGridVideoBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerGridVideoBusInputCmd {
	CALC,
	CALC_HEIGHT_MAPS,
	INIT,
	REPORT,
	SETTINGS,
	VIEW,
	WORLD,
}

export interface WorkerGridVideoBusInputDataCalcHeightMaps {
	heightMapGrid?: Uint32Array;
	heightMapParticles?: Uint32Array;
}

export interface WorkerGridVideoBusInputDataInit extends WorkerGridVideoBusInputDataSettings, WorkerGridVideoBusInputDataView {
	offscreenCanvas: OffscreenCanvas;
	report: GamingCanvasReport;
	world: World;
}

export interface WorkerGridVideoBusInputDataSettings {
	debug: boolean;
	edgesWrap: boolean;
	fps: FPS;
	gammaCorrection: number;
	grayscale: boolean;
	renderStyle: GamingCanvasRenderStyle;
}

export interface WorkerGridVideoBusInputDataView {
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
}

export interface WorkerGridVideoBusInputPayload {
	cmd: WorkerGridVideoBusInputCmd;
	data:
		| GamingCanvasReport
		| GamingCanvasGridUint32Array
		| WorkerGridVideoBusInputDataCalcHeightMaps
		| WorkerGridVideoBusInputDataInit
		| WorkerGridVideoBusInputDataSettings
		| WorkerGridVideoBusInputDataView
		| World;
}

/*
 * Output
 */
export enum WorkerGridVideoBusOutputCmd {
	INIT_COMPLETE,
	STATS,
}

export interface WorkerGridVideoBusOutputDataStats {
	all: Float32Array;
	fps: number;
}

export interface WorkerGridVideoBusOutputPayload {
	cmd: WorkerGridVideoBusOutputCmd;
	data: boolean | WorkerGridVideoBusOutputDataStats;
}
