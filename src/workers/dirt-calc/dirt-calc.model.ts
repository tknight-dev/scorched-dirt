import { FPS } from '../../models/settings.model.js';
import { Map } from '../../models/map.model.js';

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
	MAP,
	SETTINGS,
}

export interface WorkerDirtCalcBusInputDataInit extends WorkerDirtCalcBusInputDataMap, WorkerDirtCalcBusInputDataSettings {}

export interface WorkerDirtCalcBusInputDataMap {
	map: Map;
}

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

export interface WorkerDirtCalcBusOutputDataStats {
	all: Float32Array;
}

export interface WorkerDirtCalcBusOutputPayload {
	cmd: WorkerDirtCalcBusOutputCmd;
	data: boolean | WorkerDirtCalcBusOutputDataStats;
}
