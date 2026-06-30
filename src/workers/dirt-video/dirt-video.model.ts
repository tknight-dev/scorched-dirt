import { GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { FPS } from '../../models/settings.model.js';

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
	SETTINGS,
}

export interface WorkerDirtVideoBusInputDataInit extends WorkerDirtVideoBusInputDataSettings {
	gamingCanvasReport: GamingCanvasReport;
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
	offscreenCanvas: OffscreenCanvas;
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

export interface WorkerDirtVideoBusOutputDataStats {}

export interface WorkerDirtVideoBusOutputPayload {
	cmd: WorkerDirtVideoBusOutputCmd;
	data: boolean | WorkerDirtVideoBusOutputDataStats;
}
