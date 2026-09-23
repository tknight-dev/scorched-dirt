import { particleEncodingMaskX, particleEncodingMaskY, particleEncodingShiftX } from '../models/physics.model.js';
import { WorkerEffectsVideoBus } from '../workers/effects-video/effects-video.bus.js';
import { WorkerGridVideoBus } from '../workers/grid-video/grid-video.bus.js';
import { WorkerMainCalcBus } from '../workers/main-calc/main-calc.bus.js';
import { WorkerMainCalcBusOutputData } from '../workers/main-calc/main-calc.model.js';
import { WorkerParticlesVideoBus } from '../workers/particles-video/particles-video.bus.js';

/**
 * Bridge communication between buses
 *
 * @author tknight-dev
 */

export class ModuleBridge {
	public static async initialize(): Promise<void> {
		ModuleBridge.initializeCalcData();
	}

	public static initializeCalcData(): void {
		let gridData: Uint32Array,
			gridIndex: number,
			gridSideLength: number,
			gridYLimit: number,
			heightMapGrid: Uint32Array | undefined,
			heightMapParticles: Uint32Array | undefined,
			i: number,
			x: number,
			y: number;

		WorkerMainCalcBus.setCallbackData((data: WorkerMainCalcBusOutputData) => {
			/**
			 * Height Maps
			 */
			if (data.grid !== undefined) {
				gridData = data.grid.data;
				gridSideLength = data.grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;
				heightMapGrid = new Uint32Array(gridSideLength).fill(gridSideLength);

				for (x = 0; x < gridSideLength; x++) {
					gridIndex = x * gridSideLength;

					for (y = 0; y < gridYLimit; y++) {
						if (gridData[gridIndex + y] !== 0) {
							heightMapGrid[x] = y;
							break;
						}
					}
				}
			} else {
				heightMapGrid = undefined;
			}

			if (data.particles !== undefined) {
				gridSideLength = data.worldSize;
				heightMapParticles = new Uint32Array(gridSideLength).fill(gridSideLength);

				for (i = 0; i < data.particles.length; i++) {
					x = (data.particles[i] & particleEncodingMaskX) >> particleEncodingShiftX;
					y = data.particles[i] & particleEncodingMaskY;

					if (y < heightMapParticles[x]) {
						heightMapParticles[x] = y;
					}
				}
			} else {
				heightMapParticles = undefined;
			}

			/**
			 * Data Transfer: Effects
			 */
			if (data.splashes !== undefined) {
				WorkerEffectsVideoBus.sendCalc({
					splashes: data.splashes,
				});
			}

			/**
			 * Data Transfer: Height Maps
			 */
			if(heightMapGrid !== undefined || heightMapParticles !== undefined) {
				WorkerEffectsVideoBus.sendCalcHeightMaps(
					heightMapGrid !== undefined ? heightMapGrid.slice() : undefined,
					heightMapParticles !== undefined ? heightMapParticles.slice() : undefined,
				);
				WorkerGridVideoBus.sendCalcHeightMaps(
					heightMapGrid !== undefined ? heightMapGrid.slice() : undefined,
					heightMapParticles !== undefined ? heightMapParticles.slice() : undefined,
				);
				WorkerParticlesVideoBus.sendCalcHeightMaps(heightMapGrid, heightMapParticles);
			}

			/**
			 * Data Transfer: Solids
			 */
			if (data.grid !== undefined) {
				WorkerGridVideoBus.sendCalc(data.grid);
			}
			if (data.particles !== undefined) {
				WorkerParticlesVideoBus.sendCalc(data.particles);
			}
		});
	}
}
