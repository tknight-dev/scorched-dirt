import { ParticleInitial } from '../../models/physics.model.js';
import { Weapon } from '../../models/weapon.model.js';
import { World } from '../../models/world.model.js';
import {
	WorkerMainCalcBusInputCmd,
	WorkerMainCalcBusInputDataInit,
	WorkerMainCalcBusInputDataSettings,
	WorkerMainCalcBusOutputCmd,
	WorkerMainCalcBusOutputData,
	WorkerMainCalcBusOutputDataStats,
	WorkerMainCalcBusOutputPayload,
} from './main-calc.model.js';

/**
 * @author tknight-dev
 */

export class WorkerMainCalcBus {
	private static callbackData: (data: WorkerMainCalcBusOutputData) => void;
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerMainCalcBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(settings: WorkerMainCalcBusInputDataSettings, world: World, callback: (status: boolean) => void): void {
		WorkerMainCalcBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerMainCalcBus.worker = new Worker(new URL('./main-calc.engine.mjs', import.meta.url), {
				name: 'WorkerMainCalcEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerMainCalcBus.listen();

			// Init the webworker
			WorkerMainCalcBus.worker.postMessage({
				cmd: WorkerMainCalcBusInputCmd.INIT,
				data: Object.assign(
					<WorkerMainCalcBusInputDataInit>{
						world: world,
					},
					settings,
				),
			});
		} else {
			alert('Web Workers are not supported by your browser');
			WorkerMainCalcBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerMainCalcBusOutputPayload, payloads: WorkerMainCalcBusOutputPayload[];

		WorkerMainCalcBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerMainCalcBusOutputCmd.DATA:
						if (WorkerMainCalcBus.callbackData !== undefined) {
							WorkerMainCalcBus.callbackData(<WorkerMainCalcBusOutputData>payload.data);
						}
						break;
					case WorkerMainCalcBusOutputCmd.INIT_COMPLETE:
						WorkerMainCalcBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerMainCalcBusOutputCmd.STATS:
						if (WorkerMainCalcBus.callbackStats !== undefined) {
							WorkerMainCalcBus.callbackStats(<WorkerMainCalcBusOutputDataStats>payload.data);
						}
						break;
				}
			}
		};
	}

	/*
	 * Send
	 */
	public static sendParticle(data: ParticleInitial<any>): void {
		WorkerMainCalcBus.worker.postMessage({
			cmd: WorkerMainCalcBusInputCmd.PARTICLE,
			data: data,
		});
	}

	public static sendSettings(data: WorkerMainCalcBusInputDataSettings): void {
		WorkerMainCalcBus.worker.postMessage({
			cmd: WorkerMainCalcBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static setCallbackData(callbackData: (data: WorkerMainCalcBusOutputData) => void): void {
		WorkerMainCalcBus.callbackData = callbackData;
	}

	public static setCallbackStats(callbackStats: (data: WorkerMainCalcBusOutputDataStats) => void): void {
		WorkerMainCalcBus.callbackStats = callbackStats;
	}
}
