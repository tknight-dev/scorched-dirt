/**
 * @author tknight-dev
 */

export interface Shot {
	arctan: number; // 0 - pi
	posX: number; // set by calc
	posXFinal: number; // set by calc
	posXOriginal: number;
	posY: number; // set by calc
	posYFinal: number; // set by calc
	posYOriginal: number;
	power_percentage: number; // 0 - 100%
	tankId: number;
	type: ShotType;
	velX: number; // set by calc
	velY: number; // set by calc
}

export interface ShotPrice {
	cost: number;
	type: ShotType;
}

export enum ShotType {
	ARMOR_PIERCING = 0,
	BUNKER_BUSTER = 1,
	DIRT_BOMB = 2,
	HIGH_EXPLOSIVE = 3,
	STANDARD = 4,
}
