import { WorkerGridVideoBus } from '../workers/grid-video/grid-video.bus.js';
import { WorkerMainCalcBus } from '../workers/main-calc/main-calc.bus.js';
import { WorkerMainCalcBusOutputData } from '../workers/main-calc/main-calc.model.js';
import { WorkerParticleVideoBus } from '../workers/particle-video/particle-video.bus.js';

/**
 * Bridge communication between buses
 *
 * @author tknight-dev
 */

export class ModuleBridge {
	public static async initialize(): Promise<void> {
		WorkerMainCalcBus.setCallbackData((data: WorkerMainCalcBusOutputData) => {
			if (data.grid !== undefined) {
				WorkerGridVideoBus.sendCalc(data.grid);
			}
			if (data.particles !== undefined) {
				WorkerParticleVideoBus.sendCalc(data.particles);
			}
		});
	}
}
