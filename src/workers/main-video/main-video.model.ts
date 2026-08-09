import { FPS } from '../../models/settings.model.js';
import { GamingCanvasRenderStyle, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { World } from '../../models/world.model.js';

/**
 * @author tknight-dev
 */

/*
 * Stats
 */
export enum WorkerMainVideoBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerMainVideoBusInputCmd {
	CALC,
	INIT,
	REPORT,
	SETTINGS,
	VIEW,
	WORLD,
}

export interface WorkerMainVideoBusInputDataInit extends WorkerMainVideoBusInputDataSettings, WorkerMainVideoBusInputDataView {
	offscreenCanvas: OffscreenCanvas;
	report: GamingCanvasReport;
	world: World;
}

export interface WorkerMainVideoBusInputDataSettings {
	debug: boolean;
	edgesWrap: boolean;
	fps: FPS;
	gammaCorrection: number;
	grayscale: boolean;
	renderStyle: GamingCanvasRenderStyle;
}

export interface WorkerMainVideoBusInputDataView {
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
}

export interface WorkerMainVideoBusInputPayload {
	cmd: WorkerMainVideoBusInputCmd;
	data: GamingCanvasReport | WorkerMainVideoBusInputDataInit | WorkerMainVideoBusInputDataSettings | World;
}

/*
 * Output
 */
export enum WorkerMainVideoBusOutputCmd {
	INIT_COMPLETE,
	STATS,
}

export interface WorkerMainVideoBusOutputDataStats {
	all: Float32Array;
	fps: number;
}

export interface WorkerMainVideoBusOutputPayload {
	cmd: WorkerMainVideoBusOutputCmd;
	data: boolean | WorkerMainVideoBusOutputDataStats;
}
