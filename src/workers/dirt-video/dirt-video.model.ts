import { FPS } from '../../models/settings.model.js';
import { GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { Map } from '../../models/map.model.js';

/**
 * @author tknight-dev
 */

/*
 * Stats
 */
export enum WorkerDirtVideoBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerDirtVideoBusInputCmd {
	INIT,
	MAP,
	SETTINGS,
}

export interface WorkerDirtVideoBusInputDataInit extends WorkerDirtVideoBusInputDataMap, WorkerDirtVideoBusInputDataSettings {
	gamingCanvasReport: GamingCanvasReport;
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
	offscreenCanvas: OffscreenCanvas;
}

export interface WorkerDirtVideoBusInputDataMap {
	map: Map;
}

export interface WorkerDirtVideoBusInputDataSettings {
	debug: boolean;
	edgesWrap: boolean;
	fps: FPS;
	gammaCorrection: number;
	grayscale: boolean;
}

export interface WorkerDirtVideoBusInputPayload {
	cmd: WorkerDirtVideoBusInputCmd;
	data: WorkerDirtVideoBusInputDataInit | WorkerDirtVideoBusInputDataSettings;
}

/*
 * Output
 */
export enum WorkerDirtVideoBusOutputCmd {
	INIT_COMPLETE,
	STATS,
}

export interface WorkerDirtVideoBusOutputDataStats {
	all: Float32Array;
	fps: number;
}

export interface WorkerDirtVideoBusOutputPayload {
	cmd: WorkerDirtVideoBusOutputCmd;
	data: boolean | WorkerDirtVideoBusOutputDataStats;
}
