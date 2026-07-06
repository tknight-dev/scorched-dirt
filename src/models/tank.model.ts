import { ShotType } from './weapon.models.js';

/**
 * @author tknight-dev
 */

export interface Tank {
	armor: number; // 0 - 100
	health: number; // 0 - 100
	id: number;
	inventory: { [key in ShotType]: number };
	money: number;
	name: string;
	statHorsepower: number; // 0 - 10 (speed, carry weight)
	statPower: number; // 0 - 10
}
