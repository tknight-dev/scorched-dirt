import { GamingCanvas, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import { World } from '../../models/world.model.js';
import { WorkerMainCalcBusOutputData } from '../main-calc/main-calc.model.js';
import {
	WorkerParticleVideoBusInputCmd,
	WorkerParticleVideoBusInputDataInit,
	WorkerParticleVideoBusInputDataSettings,
	WorkerParticleVideoBusInputDataView,
	WorkerParticleVideoBusOutputCmd,
	WorkerParticleVideoBusOutputDataStats,
	WorkerParticleVideoBusOutputPayload,
} from './particle-video.model.js';

/**
 * @author tknight-dev
 */

export class WorkerParticleVideoBus {
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerParticleVideoBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(
		canvas: HTMLCanvasElement,
		gridCamera: GamingCanvasGridCamera,
		gridViewport: GamingCanvasGridViewport,
		settings: WorkerParticleVideoBusInputDataSettings,
		world: World,
		callback: (status: boolean) => void,
	): void {
		WorkerParticleVideoBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerParticleVideoBus.worker = new Worker(new URL('./particle-video.engine.mjs', import.meta.url), {
				name: 'WorkerParticleVideoEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerParticleVideoBus.listen();

			// Init the webworker
			const gridCameraEncoded: Float64Array = gridCamera.encode(),
				gridViewportEncoded: Float64Array = gridViewport.encode(),
				offscreenCanvas: OffscreenCanvas = canvas.transferControlToOffscreen();
			WorkerParticleVideoBus.worker.postMessage(
				{
					cmd: WorkerParticleVideoBusInputCmd.INIT,
					data: Object.assign(
						<WorkerParticleVideoBusInputDataInit>{
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
			WorkerParticleVideoBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerParticleVideoBusOutputPayload, payloads: WorkerParticleVideoBusOutputPayload[];

		WorkerParticleVideoBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerParticleVideoBusOutputCmd.INIT_COMPLETE:
						WorkerParticleVideoBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerParticleVideoBusOutputCmd.STATS:
						if (WorkerParticleVideoBus.callbackStats !== undefined) {
							WorkerParticleVideoBus.callbackStats(<WorkerParticleVideoBusOutputDataStats>payload.data);
						}
						break;
				}
			}
		};
	}

	/*
	 * Send
	 */
	public static sendCalc(data: Uint32Array): void {
		WorkerParticleVideoBus.worker.postMessage(
			{
				cmd: WorkerParticleVideoBusInputCmd.CALC,
				data: data,
			},
			[data.buffer],
		);
	}

	public static sendReport(data: GamingCanvasReport): void {
		WorkerParticleVideoBus.worker.postMessage({
			cmd: WorkerParticleVideoBusInputCmd.REPORT,
			data: data,
		});
	}

	public static sendSettings(data: WorkerParticleVideoBusInputDataSettings): void {
		WorkerParticleVideoBus.worker.postMessage({
			cmd: WorkerParticleVideoBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static sendView(data: WorkerParticleVideoBusInputDataView): void {
		WorkerParticleVideoBus.worker.postMessage(
			{
				cmd: WorkerParticleVideoBusInputCmd.VIEW,
				data: data,
			},
			[data.gridCameraEncoded, data.gridViewportEncoded],
		);
	}

	public static sendWorld(data: World): void {
		WorkerParticleVideoBus.worker.postMessage({
			cmd: WorkerParticleVideoBusInputCmd.WORLD,
			data: data,
		});
	}

	public static setCallbackStats(callbackStats: (data: WorkerParticleVideoBusOutputDataStats) => void): void {
		WorkerParticleVideoBus.callbackStats = callbackStats;
	}
}
