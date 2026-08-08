import { WeaponType } from './weapon.model.js';

/**
 * @author tknight-dev
 */

export interface Tank {
	armor: number; // 0 - 100
	health: number; // 0 - 100
	id: number;
	inventory: { [key in WeaponType]?: number };
	money: number;
	name: string;
	statHorsepower: number; // 0 - 10 (speed, carry weight)
	statPower: number; // 0 - 10
}

// Limited to 64 types. See "physics.model.ts > particleEncodingBitsTypeValue"
export enum TankType {
	STANDARD = 0,
}

export interface TankTypeProperty {
	cost: number;
	armor: number; // 0 - 100
	health: number; // 0 - 100
	weight: number; // 0 - 10
	width: number;
}

export const tankTypeProperties: { [key in TankType]: TankTypeProperty } = {
	[TankType.STANDARD]: {
		cost: 0,
		armor: 25,
		health: 75,
		weight: 5,
		width: 10,
	},
};
