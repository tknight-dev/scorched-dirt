/**
 * @author tknight-dev
 */

export interface Shot {
	power_percentage: number; // 0 - 100%
	tankId: number;
	type: ShotType;
}

export enum ShotType {
	ARMOR_PIERCING = 0,
	BUNKER_BUSTER = 1,
	DIRT_BOMB = 2,
	HIGH_EXPLOSIVE = 3,
	STANDARD = 4,
}

export interface ShotTypeProperty {
	cost: number;
	damage_armor: number;
	damage_explosive: number;
	damage_standard: number; // Un-armored damage
	explosive_radius: number; // Integer
	piercing_armor: number;
	piercing_dirt: number;
	type: ShotType;
	weight: number;
}

export const shotTypeProperties: { [key in ShotType]: ShotTypeProperty } = {
	[ShotType.ARMOR_PIERCING]: {
		cost: 0,
		damage_armor: 8,
		damage_explosive: 3,
		damage_standard: 4,
		explosive_radius: 5,
		piercing_armor: 10,
		piercing_dirt: 5,
		type: ShotType.ARMOR_PIERCING,
		weight: 5,
	},
	[ShotType.BUNKER_BUSTER]: {
		cost: 0,
		damage_armor: 2,
		damage_explosive: 8,
		damage_standard: 6,
		explosive_radius: 10,
		piercing_armor: 5,
		piercing_dirt: 10,
		type: ShotType.BUNKER_BUSTER,
		weight: 5,
	},
	[ShotType.DIRT_BOMB]: {
		cost: 0,
		damage_armor: 0,
		damage_explosive: 0,
		damage_standard: 0,
		explosive_radius: 5,
		piercing_armor: 0,
		piercing_dirt: 0,
		type: ShotType.DIRT_BOMB,
		weight: 5,
	},
	[ShotType.HIGH_EXPLOSIVE]: {
		cost: 0,
		damage_armor: 1,
		damage_explosive: 10,
		damage_standard: 4,
		explosive_radius: 15,
		piercing_armor: 0,
		piercing_dirt: 0,
		type: ShotType.HIGH_EXPLOSIVE,
		weight: 5,
	},
	[ShotType.STANDARD]: {
		cost: 0,
		damage_armor: 4,
		damage_explosive: 5,
		damage_standard: 7,
		//explosive_radius: 8,
		explosive_radius: 15,
		piercing_armor: 3,
		piercing_dirt: 3,
		type: ShotType.STANDARD,
		weight: 5,
	},
};
