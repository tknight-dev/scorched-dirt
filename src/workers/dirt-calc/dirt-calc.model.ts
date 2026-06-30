import { FPS } from '../../models/settings.model.js';

/**
 * @author tknight-dev
 */

/*
 * Stats
 */
export enum WorkerDirtCalcBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerDirtCalcBusInputCmd {
	INIT,
	SETTINGS,
}

export interface WorkerDirtCalcBusInputDataInit extends WorkerDirtCalcBusInputDataSettings {}

export interface WorkerDirtCalcBusInputDataSettings {
	edgesWrap: boolean;
	fps: FPS;
}

export interface WorkerDirtCalcBusInputPayload {
	cmd: WorkerDirtCalcBusInputCmd;
	data: WorkerDirtCalcBusInputDataInit | WorkerDirtCalcBusInputDataSettings;
}

/*
 * Output
 */
export enum WorkerDirtCalcBusOutputCmd {
	INIT_COMPLETE,
	STATS,
}

export interface WorkerDirtCalcBusOutputDataStats {}

export interface WorkerDirtCalcBusOutputPayload {
	cmd: WorkerDirtCalcBusOutputCmd;
	data: boolean | WorkerDirtCalcBusOutputDataStats;
}
