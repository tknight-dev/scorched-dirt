import { GamingCanvasGridUint8ClampedArray } from '../gaming-canvas/modules/grid/index.js';

/**
 * Bits
 */
export const mapGridBitsActive: number = 1;
export const mapGridBitsDamage: number = 3;
export const mapGridBitsType: number = 2;

export const mapGridShiftActive: number = mapGridBitsDamage + mapGridBitsType; // 3rd from right
export const mapGridShiftDamage: number = mapGridBitsType; // 2nd from right
// export const mapGridShiftType: number = 0; // 1st from right, always

export const mapGridValueActive: number = Math.pow(2, mapGridBitsActive) - 1;
export const mapGridValueDamage: number = Math.pow(2, mapGridBitsDamage) - 1;
export const mapGridValueType: number = Math.pow(2, mapGridBitsType) - 1;

export const mapGridMaskActive: number = mapGridValueActive << mapGridShiftActive;
export const mapGridMaskDamage: number = mapGridValueDamage << mapGridShiftDamage;
export const mapGridMaskType: number = mapGridValueType;

/**
 * Map
 */
export enum Solid {
	DIRT = 0,
	LAVA = 1,
	ROCK = 2,
	WATER = 3,
}

export interface Map {
	grid: GamingCanvasGridUint8ClampedArray;
	windX: number;
	windY: number;
}
