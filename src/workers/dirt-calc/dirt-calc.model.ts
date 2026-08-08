import { FPS, WindStrength } from '../../models/settings.model.js';
import { World } from '../../models/world.model.js';
import { ParticleInitial } from '../../models/physics.model.js';
import { GamingCanvasGridUint32Array } from '../../gaming-canvas/modules/grid/grid.js';
import { Weapon } from '../../models/weapon.model.js';

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
	WEAPON,
}

export interface WorkerDirtCalcBusInputDataInit extends WorkerDirtCalcBusInputDataWorld, WorkerDirtCalcBusInputDataSettings {}

export interface WorkerDirtCalcBusInputDataWorld {
	world: World;
}

export interface WorkerDirtCalcBusInputDataSettings {
	edgesWrap: boolean;
	fps: FPS;
	particlePoolSize: number;
	windRandomize: false;
	windStrength: WindStrength.NONE;
}

export interface WorkerDirtCalcBusInputPayload {
	cmd: WorkerDirtCalcBusInputCmd;
	data: ParticleInitial<Weapon> | WorkerDirtCalcBusInputDataInit | WorkerDirtCalcBusInputDataWorld | WorkerDirtCalcBusInputDataSettings;
}

/*
 * Output
 */
export enum WorkerDirtCalcBusOutputCmd {
	DATA,
	INIT_COMPLETE,
	STATS,
}

export interface WorkerDirtCalcBusOutputData {
	grid?: GamingCanvasGridUint32Array;
	particles?: Uint32Array;
}

export interface WorkerDirtCalcBusOutputDataStats {
	all: Float32Array;
	particleCount: number;
}

export interface WorkerDirtCalcBusOutputPayload {
	cmd: WorkerDirtCalcBusOutputCmd;
	data: boolean | WorkerDirtCalcBusOutputData | WorkerDirtCalcBusOutputDataStats;
}
