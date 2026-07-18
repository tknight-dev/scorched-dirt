/**
 * @author tknight-dev
 */

export interface Weapon {
	powerPercentage: number; // 0 - 1
	tankId: number;
}

// Limited to 64 types. See "physics.model.ts > particleEncodingBitsTypeValue"
export enum WeaponType {
	ARMOR_PIERCING = 0,
	BUNKER_BUSTER = 1,
	DIRT_BOMB = 2,
	HIGH_EXPLOSIVE = 3,
	STANDARD = 4,
}

export interface WeaponTypeProperty {
	cost: number;
	damageArmor: number;
	damageExplosive: number;
	damageStandard: number; // Un-armored damage
	detonationAtomizeRadius: number; // Integer
	detonationExplosiveRadius: number; // Integer
	piercingArmor: number;
	piercingSolid: number; // How many solids get atomized before detonation
	type: WeaponType;
	weight: number;
}

export const shotTypeProperties: { [key in WeaponType]: WeaponTypeProperty } = {
	[WeaponType.ARMOR_PIERCING]: {
		cost: 0,
		damageArmor: 8,
		damageExplosive: 3,
		damageStandard: 4,
		detonationAtomizeRadius: 3,
		detonationExplosiveRadius: 5,
		piercingArmor: 10,
		piercingSolid: 5,
		type: WeaponType.ARMOR_PIERCING,
		weight: 10,
	},
	[WeaponType.BUNKER_BUSTER]: {
		cost: 0,
		damageArmor: 2,
		damageExplosive: 8,
		damageStandard: 6,
		detonationAtomizeRadius: 0,
		detonationExplosiveRadius: 10,
		piercingArmor: 5,
		piercingSolid: 10,
		type: WeaponType.BUNKER_BUSTER,
		weight: 10,
	},
	[WeaponType.DIRT_BOMB]: {
		cost: 0,
		damageArmor: 0,
		damageExplosive: 0,
		damageStandard: 0,
		detonationAtomizeRadius: 0,
		detonationExplosiveRadius: 5,
		piercingArmor: 0,
		piercingSolid: 0,
		type: WeaponType.DIRT_BOMB,
		weight: 10,
	},
	[WeaponType.HIGH_EXPLOSIVE]: {
		cost: 0,
		damageArmor: 1,
		damageExplosive: 10,
		damageStandard: 4,
		detonationAtomizeRadius: 0,
		detonationExplosiveRadius: 15,
		piercingArmor: 0,
		piercingSolid: 0,
		type: WeaponType.HIGH_EXPLOSIVE,
		weight: 10,
	},
	[WeaponType.STANDARD]: {
		cost: 0,
		damageArmor: 4,
		damageExplosive: 5,
		damageStandard: 7,
		detonationAtomizeRadius: 5,
		detonationExplosiveRadius: 15,
		piercingArmor: 3,
		piercingSolid: 3,
		type: WeaponType.STANDARD,
		weight: 10,
	},
};
