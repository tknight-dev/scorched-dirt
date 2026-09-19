import { GamingCanvas, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridUint32Array, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import { World } from '../../models/world.model.js';
import { WorkerMainCalcBusOutputData } from '../main-calc/main-calc.model.js';
import {
	WorkerGridVideoBusInputCmd,
	WorkerGridVideoBusInputDataInit,
	WorkerGridVideoBusInputDataSettings,
	WorkerGridVideoBusInputDataView,
	WorkerGridVideoBusOutputCmd,
	WorkerGridVideoBusOutputDataStats,
	WorkerGridVideoBusOutputPayload,
} from './grid-video.model.js';

/**
 * @author tknight-dev
 */

export class WorkerGridVideoBus {
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerGridVideoBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(
		canvas: HTMLCanvasElement,
		gridCamera: GamingCanvasGridCamera,
		gridViewport: GamingCanvasGridViewport,
		settings: WorkerGridVideoBusInputDataSettings,
		world: World,
		callback: (status: boolean) => void,
	): void {
		WorkerGridVideoBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerGridVideoBus.worker = new Worker(new URL('./grid-video.engine.mjs', import.meta.url), {
				name: 'WorkerGridVideoEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerGridVideoBus.listen();

			// Init the webworker
			const gridCameraEncoded: Float64Array = gridCamera.encode(),
				gridViewportEncoded: Float64Array = gridViewport.encode(),
				offscreenCanvas: OffscreenCanvas = canvas.transferControlToOffscreen();
			WorkerGridVideoBus.worker.postMessage(
				{
					cmd: WorkerGridVideoBusInputCmd.INIT,
					data: Object.assign(
						<WorkerGridVideoBusInputDataInit>{
							gridCameraEncoded: gridCameraEncoded,
							gridViewportEncoded: gridViewportEncoded,
							world: world,
							offscreenCanvas: offscreenCanvas,
							report: GamingCanvas.getReport(),
						},
						settings,
					),
				},
				[gridCameraEncoded.buffer, gridViewportEncoded.buffer, offscreenCanvas],
			);
		} else {
			alert('Web Workers are not supported by your browser');
			WorkerGridVideoBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerGridVideoBusOutputPayload, payloads: WorkerGridVideoBusOutputPayload[];

		WorkerGridVideoBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerGridVideoBusOutputCmd.INIT_COMPLETE:
						WorkerGridVideoBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerGridVideoBusOutputCmd.STATS:
						if (WorkerGridVideoBus.callbackStats !== undefined) {
							WorkerGridVideoBus.callbackStats(<WorkerGridVideoBusOutputDataStats>payload.data);
						}
						break;
				}
			}
		};
	}

	/*
	 * Send
	 */
	public static sendCalc(data: GamingCanvasGridUint32Array): void {
		WorkerGridVideoBus.worker.postMessage(
			{
				cmd: WorkerGridVideoBusInputCmd.CALC,
				data: data,
			},
			[data.data.buffer],
		);
	}

	public static sendReport(data: GamingCanvasReport): void {
		WorkerGridVideoBus.worker.postMessage({
			cmd: WorkerGridVideoBusInputCmd.REPORT,
			data: data,
		});
	}

	public static sendSettings(data: WorkerGridVideoBusInputDataSettings): void {
		WorkerGridVideoBus.worker.postMessage({
			cmd: WorkerGridVideoBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static sendView(data: WorkerGridVideoBusInputDataView): void {
		WorkerGridVideoBus.worker.postMessage(
			{
				cmd: WorkerGridVideoBusInputCmd.VIEW,
				data: data,
			},
			[data.gridCameraEncoded, data.gridViewportEncoded],
		);
	}

	public static sendWorld(data: World): void {
		WorkerGridVideoBus.worker.postMessage({
			cmd: WorkerGridVideoBusInputCmd.WORLD,
			data: data,
		});
	}

	public static setCallbackStats(callbackStats: (data: WorkerGridVideoBusOutputDataStats) => void): void {
		WorkerGridVideoBus.callbackStats = callbackStats;
	}
}
