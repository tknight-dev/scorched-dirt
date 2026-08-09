import { GamingCanvas, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import { World } from '../../models/world.model.js';
import { WorkerMainCalcBusOutputData } from '../main-calc/main-calc.model.js';
import {
	WorkerMainVideoBusInputCmd,
	WorkerMainVideoBusInputDataInit,
	WorkerMainVideoBusInputDataSettings,
	WorkerMainVideoBusInputDataView,
	WorkerMainVideoBusOutputCmd,
	WorkerMainVideoBusOutputDataStats,
	WorkerMainVideoBusOutputPayload,
} from './main-video.model.js';

/**
 * @author tknight-dev
 */

export class WorkerMainVideoBus {
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerMainVideoBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(
		canvas: HTMLCanvasElement,
		gridCamera: GamingCanvasGridCamera,
		gridViewport: GamingCanvasGridViewport,
		settings: WorkerMainVideoBusInputDataSettings,
		world: World,
		callback: (status: boolean) => void,
	): void {
		WorkerMainVideoBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerMainVideoBus.worker = new Worker(new URL('./main-video.engine.mjs', import.meta.url), {
				name: 'WorkerMainVideoEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerMainVideoBus.listen();

			// Init the webworker
			const gridCameraEncoded: Float64Array = gridCamera.encode(),
				gridViewportEncoded: Float64Array = gridViewport.encode(),
				offscreenCanvas: OffscreenCanvas = canvas.transferControlToOffscreen();
			WorkerMainVideoBus.worker.postMessage(
				{
					cmd: WorkerMainVideoBusInputCmd.INIT,
					data: Object.assign(
						<WorkerMainVideoBusInputDataInit>{
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
			WorkerMainVideoBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerMainVideoBusOutputPayload, payloads: WorkerMainVideoBusOutputPayload[];

		WorkerMainVideoBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerMainVideoBusOutputCmd.INIT_COMPLETE:
						WorkerMainVideoBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerMainVideoBusOutputCmd.STATS:
						if (WorkerMainVideoBus.callbackStats !== undefined) {
							WorkerMainVideoBus.callbackStats(<WorkerMainVideoBusOutputDataStats>payload.data);
						}
						break;
				}
			}
		};
	}

	/*
	 * Send
	 */
	public static sendCalc(data: WorkerMainCalcBusOutputData): void {
		let buffers: ArrayBufferLike[] = [];

		if (data.grid !== undefined) {
			buffers.push(data.grid.data.buffer);
		}

		if (data.particles !== undefined) {
			buffers.push(data.particles.buffer);
		}

		WorkerMainVideoBus.worker.postMessage(
			{
				cmd: WorkerMainVideoBusInputCmd.CALC,
				data: data,
			},
			buffers,
		);
	}

	public static sendReport(data: GamingCanvasReport): void {
		WorkerMainVideoBus.worker.postMessage({
			cmd: WorkerMainVideoBusInputCmd.REPORT,
			data: data,
		});
	}

	public static sendSettings(data: WorkerMainVideoBusInputDataSettings): void {
		WorkerMainVideoBus.worker.postMessage({
			cmd: WorkerMainVideoBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static sendView(data: WorkerMainVideoBusInputDataView): void {
		WorkerMainVideoBus.worker.postMessage(
			{
				cmd: WorkerMainVideoBusInputCmd.VIEW,
				data: data,
			},
			[data.gridCameraEncoded, data.gridViewportEncoded],
		);
	}

	public static sendWorld(data: World): void {
		WorkerMainVideoBus.worker.postMessage({
			cmd: WorkerMainVideoBusInputCmd.WORLD,
			data: data,
		});
	}

	public static setCallbackStats(callbackStats: (data: WorkerMainVideoBusOutputDataStats) => void): void {
		WorkerMainVideoBus.callbackStats = callbackStats;
	}
}
