import {
	WorkerDirtVideoBusInputCmd,
	WorkerDirtVideoBusInputDataInit,
	WorkerDirtVideoBusInputDataSettings,
	WorkerDirtVideoBusOutputCmd,
	WorkerDirtVideoBusOutputDataStats,
	WorkerDirtVideoBusOutputPayload,
} from './dirt-video.model.js';
import { GamingCanvas } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';

/**
 * @author tknight-dev
 */

export class WorkerDirtVideoBus {
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerDirtVideoBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(
		canvas: HTMLCanvasElement,
		gridCamera: GamingCanvasGridCamera,
		gridViewport: GamingCanvasGridViewport,
		settings: WorkerDirtVideoBusInputDataSettings,
		callback: (status: boolean) => void,
	): void {
		WorkerDirtVideoBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerDirtVideoBus.worker = new Worker(new URL('./dirt-video.engine.mjs', import.meta.url), {
				name: 'WorkerDirtVideoEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerDirtVideoBus.listen();

			// Init the webworker
			const gridCameraEncoded: Float64Array = gridCamera.encode(),
				gridViewportEncoded: Float64Array = gridViewport.encode(),
				offscreenCanvas: OffscreenCanvas = canvas.transferControlToOffscreen();
			WorkerDirtVideoBus.worker.postMessage(
				{
					cmd: WorkerDirtVideoBusInputCmd.INIT,
					data: Object.assign(
						<WorkerDirtVideoBusInputDataInit>{
							gamingCanvasReport: GamingCanvas.getReport(),
							gridCameraEncoded: gridCameraEncoded,
							gridViewportEncoded: gridViewportEncoded,
							offscreenCanvas: offscreenCanvas,
						},
						settings,
					),
				},
				[gridCameraEncoded.buffer, gridViewportEncoded.buffer, offscreenCanvas],
			);
		} else {
			alert('Web Workers are not supported by your browser');
			WorkerDirtVideoBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerDirtVideoBusOutputPayload, payloads: WorkerDirtVideoBusOutputPayload[];

		WorkerDirtVideoBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerDirtVideoBusOutputCmd.INIT_COMPLETE:
						WorkerDirtVideoBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerDirtVideoBusOutputCmd.STATS:
						if (WorkerDirtVideoBus.callbackStats !== undefined) {
							WorkerDirtVideoBus.callbackStats(<WorkerDirtVideoBusOutputDataStats>payload.data);
						}
						break;
				}
			}
		};
	}

	/*
	 * Send
	 */
	public static sendSettings(data: WorkerDirtVideoBusInputDataSettings): void {
		WorkerDirtVideoBus.worker.postMessage({
			cmd: WorkerDirtVideoBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static setCallbackStats(callbackStats: (data: WorkerDirtVideoBusOutputDataStats) => void): void {
		WorkerDirtVideoBus.callbackStats = callbackStats;
	}
}
