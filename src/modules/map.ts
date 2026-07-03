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
			},
			x: number,
			xEff: number,
			y: number;

		console.log(`ModuleMap > generate: mapPixels=${mapSize * mapSize}, mapSize=${mapSize}, seed=${seed}`);

		// Dirt
		for (x = 0; x < mapSize; x++) {
			xEff = x * mapSize;

			for (y = Math.round(mapSize * 0.3); y < mapSize; y++) {
				gridData[xEff + y] = 0x1 << mapGridShiftActive;
			}
		}

		return map;
	}
}
