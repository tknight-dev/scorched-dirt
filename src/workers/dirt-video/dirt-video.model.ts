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
}

export interface WorkerDirtVideoBusInputDataInit extends WorkerDirtVideoBusInputDataSettings {}

export interface WorkerDirtVideoBusInputDataSettings {
	fps: FPS;
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
