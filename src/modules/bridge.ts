import { WorkerMainCalcBus } from '../workers/main-calc/main-calc.bus.js';
import { WorkerMainCalcBusOutputData } from '../workers/main-calc/main-calc.model.js';
import { WorkerMainVideoBus } from '../workers/main-video/main-video.bus.js';

/**
 * Bridge communication between buses
 *
 * @author tknight-dev
 */

export class ModuleBridge {
	public static async initialize(): Promise<void> {
		// Worker: Dirt Calc
		WorkerMainCalcBus.setCallbackData((data: WorkerMainCalcBusOutputData) => {
			WorkerMainVideoBus.sendCalc(data);
		});
	}
}
