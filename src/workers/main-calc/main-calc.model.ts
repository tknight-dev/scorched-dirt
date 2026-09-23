import { FPS, WindStrength, WorldSize } from '../../models/settings.model.js';
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
export enum WorkerMainCalcBusStats {
	ALL,
}

/*
 * Input
 */
export enum WorkerMainCalcBusInputCmd {
	INIT,
	MAP,
	PARTICLE,
	SETTINGS,
}

export interface WorkerMainCalcBusInputDataInit extends WorkerMainCalcBusInputDataWorld, WorkerMainCalcBusInputDataSettings {}

export interface WorkerMainCalcBusInputDataWorld {
	world: World;
}

export interface WorkerMainCalcBusInputDataSettings {
	edgesWrap: boolean;
	fps: FPS;
	particlePoolSize: number;
	windRandomize: false;
	windStrength: WindStrength.NONE;
}

export interface WorkerMainCalcBusInputPayload {
	cmd: WorkerMainCalcBusInputCmd;
	data:
		| ParticleInitial<Weapon>
		| ParticleInitial<Weapon>[]
		| WorkerMainCalcBusInputDataInit
		| WorkerMainCalcBusInputDataWorld
		| WorkerMainCalcBusInputDataSettings;
}

/*
 * Output
 */
export enum WorkerMainCalcBusOutputCmd {
	DATA,
	INIT_COMPLETE,
	STATS,
}

export interface WorkerMainCalcBusOutputData {
	grid?: GamingCanvasGridUint32Array;
	particles?: Uint32Array;
	splashes?: Uint32Array;
	worldSize: WorldSize;
}

export interface WorkerMainCalcBusOutputDataStats {
	all: Float32Array;
	particleCount: number;
	particlePoolSize: number;
}

export interface WorkerMainCalcBusOutputPayload {
	cmd: WorkerMainCalcBusOutputCmd;
	data: boolean | WorkerMainCalcBusOutputData | WorkerMainCalcBusOutputDataStats;
}
