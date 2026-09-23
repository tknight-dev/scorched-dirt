import { GamingCanvas, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import { World } from '../../models/world.model.js';
import { WorkerMainCalcBusOutputData } from '../main-calc/main-calc.model.js';
import {
	WorkerParticlesVideoBusInputCmd,
	WorkerParticlesVideoBusInputDataInit,
	WorkerParticlesVideoBusInputDataSettings,
	WorkerParticlesVideoBusInputDataView,
	WorkerParticlesVideoBusOutputCmd,
	WorkerParticlesVideoBusOutputDataStats,
	WorkerParticlesVideoBusOutputPayload,
} from './particles-video.model.js';

/**
 * @author tknight-dev
 */

export class WorkerParticlesVideoBus {
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerParticlesVideoBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(
		canvas: HTMLCanvasElement,
		gridCamera: GamingCanvasGridCamera,
		gridViewport: GamingCanvasGridViewport,
		settings: WorkerParticlesVideoBusInputDataSettings,
		world: World,
		callback: (status: boolean) => void,
	): void {
		WorkerParticlesVideoBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerParticlesVideoBus.worker = new Worker(new URL('./particles-video.engine.mjs', import.meta.url), {
				name: 'WorkerParticlesVideoEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerParticlesVideoBus.listen();

			// Init the webworker
			const gridCameraEncoded: Float64Array = gridCamera.encode(),
				gridViewportEncoded: Float64Array = gridViewport.encode(),
				offscreenCanvas: OffscreenCanvas = canvas.transferControlToOffscreen();
			WorkerParticlesVideoBus.worker.postMessage(
				{
					cmd: WorkerParticlesVideoBusInputCmd.INIT,
					data: Object.assign(
						<WorkerParticlesVideoBusInputDataInit>{
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
			WorkerParticlesVideoBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerParticlesVideoBusOutputPayload, payloads: WorkerParticlesVideoBusOutputPayload[];

		WorkerParticlesVideoBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerParticlesVideoBusOutputCmd.INIT_COMPLETE:
						WorkerParticlesVideoBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerParticlesVideoBusOutputCmd.STATS:
						if (WorkerParticlesVideoBus.callbackStats !== undefined) {
							WorkerParticlesVideoBus.callbackStats(<WorkerParticlesVideoBusOutputDataStats>payload.data);
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
		WorkerParticlesVideoBus.worker.postMessage(
			{
				cmd: WorkerParticlesVideoBusInputCmd.CALC,
				data: data,
			},
			[data.buffer],
		);
	}

	public static sendCalcHeightMaps(heightMapGrid?: Uint32Array, heightMapParticles?: Uint32Array): void {
		let buffers: ArrayBufferLike[] = [];

		if (heightMapGrid !== undefined) {
			buffers.push(heightMapGrid.buffer);
		}

		if (heightMapParticles !== undefined) {
			buffers.push(heightMapParticles.buffer);
		}

		WorkerParticlesVideoBus.worker.postMessage(
			{
				cmd: WorkerParticlesVideoBusInputCmd.CALC_HEIGHT_MAPS,
				data: {
					heightMapGrid: heightMapGrid,
					heightMapParticles: heightMapParticles,
				},
			},
			buffers,
		);
	}

	public static sendReport(data: GamingCanvasReport): void {
		WorkerParticlesVideoBus.worker.postMessage({
			cmd: WorkerParticlesVideoBusInputCmd.REPORT,
			data: data,
		});
	}

	public static sendSettings(data: WorkerParticlesVideoBusInputDataSettings): void {
		WorkerParticlesVideoBus.worker.postMessage({
			cmd: WorkerParticlesVideoBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static sendView(data: WorkerParticlesVideoBusInputDataView): void {
		WorkerParticlesVideoBus.worker.postMessage(
			{
				cmd: WorkerParticlesVideoBusInputCmd.VIEW,
				data: data,
			},
			[data.gridCameraEncoded, data.gridViewportEncoded],
		);
	}

	public static sendWorld(data: World): void {
		WorkerParticlesVideoBus.worker.postMessage({
			cmd: WorkerParticlesVideoBusInputCmd.WORLD,
			data: data,
		});
	}

	public static setCallbackStats(callbackStats: (data: WorkerParticlesVideoBusOutputDataStats) => void): void {
		WorkerParticlesVideoBus.callbackStats = callbackStats;
	}
}
