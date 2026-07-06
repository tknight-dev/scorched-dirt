import { Map } from '../../models/map.model.js';
import { Physics } from '../../models/physics.model.js';
import { Shot } from '../../models/weapon.models.js';
import {
	WorkerDirtCalcBusInputCmd,
	WorkerDirtCalcBusInputDataInit,
	WorkerDirtCalcBusInputDataSettings,
	WorkerDirtCalcBusOutputCmd,
	WorkerDirtCalcBusOutputData,
	WorkerDirtCalcBusOutputDataStats,
	WorkerDirtCalcBusOutputPayload,
} from './dirt-calc.model.js';

/**
 * @author tknight-dev
 */

export class WorkerDirtCalcBus {
	private static callbackData: (data: WorkerDirtCalcBusOutputData) => void;
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerDirtCalcBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(settings: WorkerDirtCalcBusInputDataSettings, map: Map, callback: (status: boolean) => void): void {
		WorkerDirtCalcBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerDirtCalcBus.worker = new Worker(new URL('./dirt-calc.engine.mjs', import.meta.url), {
				name: 'WorkerDirtCalcEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerDirtCalcBus.listen();

			// Init the webworker
			WorkerDirtCalcBus.worker.postMessage({
				cmd: WorkerDirtCalcBusInputCmd.INIT,
				data: Object.assign(
					<WorkerDirtCalcBusInputDataInit>{
						map: map,
					},
					settings,
				),
			});
		} else {
			alert('Web Workers are not supported by your browser');
			WorkerDirtCalcBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerDirtCalcBusOutputPayload, payloads: WorkerDirtCalcBusOutputPayload[];

		WorkerDirtCalcBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerDirtCalcBusOutputCmd.DATA:
						if (WorkerDirtCalcBus.callbackData !== undefined) {
							WorkerDirtCalcBus.callbackData(<WorkerDirtCalcBusOutputData>payload.data);
						}
						break;
					case WorkerDirtCalcBusOutputCmd.INIT_COMPLETE:
						WorkerDirtCalcBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerDirtCalcBusOutputCmd.STATS:
						if (WorkerDirtCalcBus.callbackStats !== undefined) {
							WorkerDirtCalcBus.callbackStats(<WorkerDirtCalcBusOutputDataStats>payload.data);
						}
						break;
				}
			}
		};
	}

	/*
	 * Send
	 */
	public static sendSettings(data: WorkerDirtCalcBusInputDataSettings): void {
		WorkerDirtCalcBus.worker.postMessage({
			cmd: WorkerDirtCalcBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static sendShot(data: Physics<Shot>): void {
		WorkerDirtCalcBus.worker.postMessage({
			cmd: WorkerDirtCalcBusInputCmd.SHOT,
			data: data,
		});
	}

	public static setCallbackData(callbackData: (data: WorkerDirtCalcBusOutputData) => void): void {
		WorkerDirtCalcBus.callbackData = callbackData;
	}

	public static setCallbackStats(callbackStats: (data: WorkerDirtCalcBusOutputDataStats) => void): void {
		WorkerDirtCalcBus.callbackStats = callbackStats;
	}
}
