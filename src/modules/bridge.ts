import { WorkerDirtCalcBus } from '../workers/dirt-calc/dirt-calc.bus.js';
import { WorkerDirtCalcBusOutputData } from '../workers/dirt-calc/dirt-calc.model.js';
import { WorkerDirtVideoBus } from '../workers/dirt-video/dirt-video.bus.js';

/**
 * Bridge communication between buses
 *
 * @author tknight-dev
 */

export class ModuleBridge {
	public static async initialize(): Promise<void> {
		// Worker: Dirt Calc
		WorkerDirtCalcBus.setCallbackData((data: WorkerDirtCalcBusOutputData) => {
			WorkerDirtVideoBus.sendCalc(data);
		});
	}
}
