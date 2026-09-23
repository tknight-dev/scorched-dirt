import { FPS } from '../../models/settings.model.js';
import { GamingCanvasRenderStyle, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { World } from '../../models/world.model.js';

/**
 * @author tknight-dev
 */

/*
 * Stats
 */
export enum WorkerParticlesVideoBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerParticlesVideoBusInputCmd {
	CALC,
	CALC_HEIGHT_MAPS,
	INIT,
	REPORT,
	SETTINGS,
	VIEW,
	WORLD,
}

export interface WorkerParticlesVideoBusInputDataCalcHeightMaps {
	heightMapGrid?: Uint32Array;
	heightMapParticles?: Uint32Array;
}

export interface WorkerParticlesVideoBusInputDataInit extends WorkerParticlesVideoBusInputDataSettings, WorkerParticlesVideoBusInputDataView {
	offscreenCanvas: OffscreenCanvas;
	report: GamingCanvasReport;
	world: World;
}

export interface WorkerParticlesVideoBusInputDataSettings {
	debug: boolean;
	fps: FPS;
	gammaCorrection: number;
	grayscale: boolean;
	renderStyle: GamingCanvasRenderStyle;
}

export interface WorkerParticlesVideoBusInputDataView {
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
}

export interface WorkerParticlesVideoBusInputPayload {
	cmd: WorkerParticlesVideoBusInputCmd;
	data:
		| GamingCanvasReport
		| Uint32Array
		| WorkerParticlesVideoBusInputDataCalcHeightMaps
		| WorkerParticlesVideoBusInputDataInit
		| WorkerParticlesVideoBusInputDataSettings
		| WorkerParticlesVideoBusInputDataView
		| World;
}

/*
 * Output
 */
export enum WorkerParticlesVideoBusOutputCmd {
	INIT_COMPLETE,
	STATS,
}

export interface WorkerParticlesVideoBusOutputDataStats {
	all: Float32Array;
	fps: number;
}

export interface WorkerParticlesVideoBusOutputPayload {
	cmd: WorkerParticlesVideoBusOutputCmd;
	data: boolean | WorkerParticlesVideoBusOutputDataStats;
}
