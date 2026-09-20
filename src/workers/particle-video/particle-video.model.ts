import { FPS } from '../../models/settings.model.js';
import { GamingCanvasRenderStyle, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { World } from '../../models/world.model.js';

/**
 * @author tknight-dev
 */

/*
 * Stats
 */
export enum WorkerParticleVideoBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerParticleVideoBusInputCmd {
	CALC,
	CALC_HEIGHT_MAPS,
	INIT,
	REPORT,
	SETTINGS,
	VIEW,
	WORLD,
}

export interface WorkerParticleVideoBusInputDataCalcHeightMaps {
	heightMapGrid?: Uint32Array;
	heightMapParticles?: Uint32Array;
}

export interface WorkerParticleVideoBusInputDataInit extends WorkerParticleVideoBusInputDataSettings, WorkerParticleVideoBusInputDataView {
	offscreenCanvas: OffscreenCanvas;
	report: GamingCanvasReport;
	world: World;
}

export interface WorkerParticleVideoBusInputDataSettings {
	debug: boolean;
	edgesWrap: boolean;
	fps: FPS;
	gammaCorrection: number;
	grayscale: boolean;
	renderStyle: GamingCanvasRenderStyle;
}

export interface WorkerParticleVideoBusInputDataView {
	gridCameraEncoded: Float64Array;
	gridViewportEncoded: Float64Array;
}

export interface WorkerParticleVideoBusInputPayload {
	cmd: WorkerParticleVideoBusInputCmd;
	data:
		| GamingCanvasReport
		| Uint32Array
		| WorkerParticleVideoBusInputDataCalcHeightMaps
		| WorkerParticleVideoBusInputDataInit
		| WorkerParticleVideoBusInputDataSettings
		| WorkerParticleVideoBusInputDataView
		| World;
}

/*
 * Output
 */
export enum WorkerParticleVideoBusOutputCmd {
	INIT_COMPLETE,
	STATS,
}

export interface WorkerParticleVideoBusOutputDataStats {
	all: Float32Array;
	fps: number;
}

export interface WorkerParticleVideoBusOutputPayload {
	cmd: WorkerParticleVideoBusOutputCmd;
	data: boolean | WorkerParticleVideoBusOutputDataStats;
}
