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
