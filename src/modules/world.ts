import { GamingCanvasGridUint32Array } from '../gaming-canvas/modules/grid/index.js';
import { SolidType, World, worldEncodingMaskHealth } from '../models/world.model.js';
import { WorldSize } from '../models/settings.model.js';

/**
 * @author tknight-dev
 */

export class ModuleWorld {
	public static worldActive: World;

	public static generate(worldSize: WorldSize, seed: number): World {
		let grid: GamingCanvasGridUint32Array = new GamingCanvasGridUint32Array(worldSize),
			gridData: Uint32Array = grid.data,
			world: World = {
				bedrock: true,
				grid: grid,
				windX: 0,
				windY: 0,
			},
			x: number,
			xIndex: number,
			y: number,
			yLimit: number = (worldSize * 9) / 16;

		// console.log(`ModuleWorld > generate: worldPixels=${worldSize * worldSize}, worldSize=${worldSize}, seed=${seed}`);

		// Lava
		for (x = (worldSize / 1.25) | 0; x < worldSize; x++) {
			xIndex = x * worldSize;

			for (y = (yLimit * 0.175) | 0; y < ((yLimit * 0.25) | 0); y++) {
				gridData[xIndex + y] = worldEncodingMaskHealth | SolidType.LAVA;
			}
		}

		// Water
		for (x = 0; x < worldSize; x++) {
			xIndex = x * worldSize;

			for (y = (yLimit * 0.8) | 0; y < yLimit; y++) {
				gridData[xIndex + y] = worldEncodingMaskHealth | SolidType.WATER;
			}
		}

		// Dirt
		for (x = 0; x < worldSize; x++) {
			xIndex = x * worldSize;

			for (y = yLimit; y >= Math.min(yLimit - 10, x); y--) {
				gridData[xIndex + y] = worldEncodingMaskHealth | SolidType.DIRT;
			}
		}
		for (x = (worldSize / 1.5) | 0; x < worldSize; x++) {
			xIndex = x * worldSize;

			for (y = (yLimit * 0.25) | 0; y < ((yLimit * 0.5) | 0); y++) {
				gridData[xIndex + y] = worldEncodingMaskHealth | SolidType.DIRT;
			}
		}

		// Rock
		for (x = (worldSize / 1.5) | 0; x < worldSize; x++) {
			xIndex = x * worldSize;

			for (y = (yLimit * 0.2) | 0; y < ((yLimit * 0.25) | 0); y++) {
				gridData[xIndex + y] = worldEncodingMaskHealth | SolidType.ROCK;
			}
		}

		let count: number = 0;
		for (x = (worldSize / 1.5) | 0; x < worldSize; x++) {
			xIndex = x * worldSize;

			for (y = (yLimit * 0.45) | 0; y < ((yLimit * 0.5) | 0); y++) {
				gridData[xIndex + y] = worldEncodingMaskHealth | SolidType.ROCK;
			}

			if (count === 20) {
				x += 20;
				count = 0;
			} else {
				count++;
			}
		}

		// Void
		for (x = (worldSize / 4) | 0; x < ((worldSize / 3) | 0); x++) {
			xIndex = x * worldSize;

			for (y = 0; y < yLimit; y++) {
				gridData[xIndex + y] = 0;
			}
		}

		return world;
	}
}
