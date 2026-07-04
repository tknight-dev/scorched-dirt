import { GamingCanvasGridUint8ClampedArray } from '../gaming-canvas/modules/grid/index.js';
import { Map, mapGridShiftActive } from '../models/map.model.js';
import { MapSize } from '../models/settings.model.js';

/**
 * @author tknight-dev
 */

export class ModuleMap {
	public static mapActive: Map;

	public static generate(mapSize: MapSize, seed: number): Map {
		let grid: GamingCanvasGridUint8ClampedArray = new GamingCanvasGridUint8ClampedArray(mapSize),
			gridData: Uint8ClampedArray = grid.data,
			map: Map = {
				grid: grid,
				windX: 0,
				windY: 0,
			},
			x: number,
			xEff: number,
			y: number,
			yLimit: number = (mapSize * 9) / 16;

		// console.log(`ModuleMap > generate: mapPixels=${mapSize * mapSize}, mapSize=${mapSize}, seed=${seed}`);

		// Dirt
		for (x = 0; x < mapSize; x++) {
			xEff = x * mapSize;

			for (y = yLimit; y >= Math.min(yLimit - 10, x); y--) {
				gridData[xEff + y] = 0x1 << mapGridShiftActive;
			}
		}

		return map;
	}
}
