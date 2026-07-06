/**
 * @author tknight-dev
 */

export interface Physics<T> {
	arctanOriginal: number;
	payload: T;
	posXOriginal: number;
	posYOriginal: number;
	physicalType: PhysicsType;
}

export interface PhysicsCalculated<T> extends Physics<T> {
	posX: number;
	posXFinal: number;
	posY: number;
	posYFinal: number;
	velX: number;
	velY: number;
}

export enum PhysicsType {
	DIRT,
	ROCK,
	WEAPON,
}
