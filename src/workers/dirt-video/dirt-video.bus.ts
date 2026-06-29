import {
	WorkerDirtVideoBusInputCmd,
	WorkerDirtVideoBusInputDataSettings,
	WorkerDirtVideoBusOutputCmd,
	WorkerDirtVideoBusOutputDataStats,
	WorkerDirtVideoBusOutputPayload,
} from './dirt-video.model.js';

/**
 * @author tknight-dev
 */

export class WorkerDirtVideoBus {
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackPathUpdate: (data: Map<number, number[]>) => void;
	private static callbackStats: (data: WorkerDirtVideoBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(settings: WorkerDirtVideoBusInputDataSettings, callback: (status: boolean) => void): void {
		WorkerDirtVideoBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerDirtVideoBus.worker = new Worker(new URL('./dirt-video.engine.mjs', import.meta.url), {
				name: 'WorkerDirtVideoEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerDirtVideoBus.input();

			// Init the webworker
			WorkerDirtVideoBus.worker.postMessage({
				cmd: WorkerDirtVideoBusInputCmd.INIT,
				data: Object.assign({}, settings),
			});
		} else {
			alert('Web Workers are not supported by your browser');
			WorkerDirtVideoBus.callbackInitComplete(false);
		}
	}

	private static input(): void {
		let payload: WorkerDirtVideoBusOutputPayload, payloads: WorkerDirtVideoBusOutputPayload[];

		WorkerDirtVideoBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerDirtVideoBusOutputCmd.INIT_COMPLETE:
						WorkerDirtVideoBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerDirtVideoBusOutputCmd.STATS:
						WorkerDirtVideoBus.callbackStats(<WorkerDirtVideoBusOutputDataStats>payload.data);
						break;
				}
			}
		};
	}

	/*
	 * Output
	 */

	public static setCallbackStats(callbackStats: (data: WorkerDirtVideoBusOutputDataStats) => void): void {
		WorkerDirtVideoBus.callbackStats = callbackStats;
	}
}
