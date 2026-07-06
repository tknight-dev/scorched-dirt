import { FPS } from '../../models/settings.model.js';
import { GamingCanvasRenderStyle, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
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
	CALC,
	INIT,
	MAP,
	REPORT,
	SETTINGS,
	VIEW,
}

export interface WorkerDirtVideoBusInputDataInit extends WorkerDirtVideoBusInputDataSettings, WorkerDirtVideoBusInputDataView {
	map: Map;
	offscreenCanvas: OffscreenCanvas;
	report: GamingCanvasReport;
}

export interface WorkerDirtVideoBusInputDataSettings {
	debug: boolean;
	edgesWrap: boolean;
	fps: FPS;
	gammaCorrection: number;
	grayscale: boolean;
	renderStyle: GamingCanvasRenderStyle;
}

export interface WorkerDirtVideoBusInputDataView {
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
}

export interface WorkerDirtVideoBusInputPayload {
	cmd: WorkerDirtVideoBusInputCmd;
	data: GamingCanvasReport | Map | WorkerDirtVideoBusInputDataInit | WorkerDirtVideoBusInputDataSettings;
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
