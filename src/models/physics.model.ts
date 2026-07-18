/**
 * @author tknight-dev
 */

/**
 * Encoding
 *
 * Encoded values only contain the variables required to draw the element graphically
 */
export const particleEncodingBitsHealth: number = 2;
export const particleEncodingBitsType: number = 2;
export const particleEncodingBitsTypeValue: number = 6;
export const particleEncodingBitsX: number = 11;
export const particleEncodingBitsY: number = 11;

export const particleEncodingShiftHealth: number = particleEncodingBitsType + particleEncodingBitsTypeValue + particleEncodingBitsX + particleEncodingBitsY; // 4th from right
export const particleEncodingShiftType: number = particleEncodingBitsTypeValue + particleEncodingBitsX + particleEncodingBitsY; // 4th from right
export const particleEncodingShiftTypeValue: number = particleEncodingBitsX + particleEncodingBitsY; // 4th from right
export const particleEncodingShiftX: number = particleEncodingBitsY; // 3rd from right
// export const particleEncodingShiftY: number = particleEncodingBitsSolidType; // 1st from right, always

export const particleEncodingValueHealth: number = Math.pow(2, particleEncodingBitsHealth) - 1;
export const particleEncodingValueType: number = Math.pow(2, particleEncodingBitsType) - 1;
export const particleEncodingValueTypeValue: number = Math.pow(2, particleEncodingBitsTypeValue) - 1;
export const particleEncodingValueX: number = Math.pow(2, particleEncodingBitsX) - 1;
export const particleEncodingValueY: number = Math.pow(2, particleEncodingBitsY) - 1;

export const particleEncodingMaskHealth: number = particleEncodingValueHealth << particleEncodingShiftHealth;
export const particleEncodingMaskType: number = particleEncodingValueType << particleEncodingShiftType;
export const particleEncodingMaskTypeValue: number = particleEncodingValueTypeValue << particleEncodingShiftTypeValue;
export const particleEncodingMaskX: number = particleEncodingValueX << particleEncodingShiftX;
export const particleEncodingMaskY: number = particleEncodingValueY;

/**
 * Particle
 */
export interface ParticleInitial<T> extends ParticleInitialBase {
	arctan: number;
	payload: T;
	posX: number;
	posY: number;
}

export interface ParticleInitialBase {
	health: number; // 0 - 4
	type: ParticleType;
	typeValue: number;
}

export interface Particle<T> extends ParticleInitial<T> {
	arctanOriginal: number;
	posXOriginal: number;
	posYOriginal: number;
	velX: number;
	velXScaled: number;
	velXScaledAbs: number;
	velXStep: number;
	velY: number;
	velYScaled: number;
	velYScaledAbs: number;
	velYStep: number;
}

// Limited to 4
export enum ParticleType {
	SOLID = 0,
	TANK = 1,
	WEAPON = 2,
}
