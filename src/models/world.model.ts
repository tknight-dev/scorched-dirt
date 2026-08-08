import { GamingCanvasGridUint32Array } from '../gaming-canvas/modules/grid/index.js';

/**
 * @author tknight-dev
 */

/**
 * Encoding
 *
 * Encoded values only contain the variables required to draw the element graphically
 */
export const worldEncodingBitsHealth: number = 2; // Must match "physics.model.ts"
export const worldEncodingBitsSolidType: number = 6; // Must match "physics.model.ts"

export const worldEncodingShiftHealth: number = worldEncodingBitsSolidType; // 2nd from right
// export const worldEncodingShiftType: number = 0; // 1st from right, always

export const worldEncodingValueHealth: number = Math.pow(2, worldEncodingBitsHealth) - 1;
export const worldEncodingValueType: number = Math.pow(2, worldEncodingBitsSolidType) - 1;

export const worldEncodingMaskHealth: number = worldEncodingValueHealth << worldEncodingShiftHealth;
export const worldEncodingMaskType: number = worldEncodingValueType;

/**
 * Solid
 */
export interface Solid {}

// Limited to 64 types. See "physics.model.ts > particleEncodingBitsTypeValue"
export enum SolidType {
	DIRT = 0,
	LAVA = 1,
	ROCK = 2,
	WATER = 3,
	WEAPON = 4, // WHY? ... the map has built in explosives? ... or drones or something
}

/**
 * World
 */
export interface World {
	bedrock: boolean; // The bottom of the map should stack solids (true) or just delete them (false)
	grid: GamingCanvasGridUint32Array;
	windX: number;
	windY: number;
}
