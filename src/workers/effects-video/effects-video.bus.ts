import { GamingCanvas, GamingCanvasReport } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import { World } from '../../models/world.model.js';
import { WorkerMainCalcBusOutputData } from '../main-calc/main-calc.model.js';
import {
	WorkerEffectsVideoBusInputCmd,
	WorkerEffectsVideoBusInputDataCalc,
	WorkerEffectsVideoBusInputDataInit,
	WorkerEffectsVideoBusInputDataSettings,
	WorkerEffectsVideoBusInputDataView,
	WorkerEffectsVideoBusOutputCmd,
	WorkerEffectsVideoBusOutputDataStats,
	WorkerEffectsVideoBusOutputPayload,
} from './effects-video.model.js';

/**
 * @author tknight-dev
 */

export class WorkerEffectsVideoBus {
	private static callbackInitComplete: (status: boolean) => void;
	private static callbackStats: (data: WorkerEffectsVideoBusOutputDataStats) => void;
	private static worker: Worker;

	public static initialize(
		canvas: HTMLCanvasElement,
		gridCamera: GamingCanvasGridCamera,
		gridViewport: GamingCanvasGridViewport,
		settings: WorkerEffectsVideoBusInputDataSettings,
		world: World,
		callback: (status: boolean) => void,
	): void {
		WorkerEffectsVideoBus.callbackInitComplete = callback;

		// Spawn the WebWorker
		if (window.Worker) {
			WorkerEffectsVideoBus.worker = new Worker(new URL('./effects-video.engine.mjs', import.meta.url), {
				name: 'WorkerEffectsVideoEngine',
				type: 'module', // ESM
			});

			// Listen for a response from the WebWorker
			WorkerEffectsVideoBus.listen();

			// Init the webworker
			const gridCameraEncoded: Float64Array = gridCamera.encode(),
				gridViewportEncoded: Float64Array = gridViewport.encode(),
				offscreenCanvas: OffscreenCanvas = canvas.transferControlToOffscreen();
			WorkerEffectsVideoBus.worker.postMessage(
				{
					cmd: WorkerEffectsVideoBusInputCmd.INIT,
					data: Object.assign(
						<WorkerEffectsVideoBusInputDataInit>{
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
			WorkerEffectsVideoBus.callbackInitComplete(false);
		}
	}

	private static listen(): void {
		let payload: WorkerEffectsVideoBusOutputPayload, payloads: WorkerEffectsVideoBusOutputPayload[];

		WorkerEffectsVideoBus.worker.onmessage = async (event: MessageEvent) => {
			payloads = event.data;

			for (payload of payloads) {
				switch (payload.cmd) {
					case WorkerEffectsVideoBusOutputCmd.INIT_COMPLETE:
						WorkerEffectsVideoBus.callbackInitComplete(<boolean>payload.data);
						break;
					case WorkerEffectsVideoBusOutputCmd.STATS:
						if (WorkerEffectsVideoBus.callbackStats !== undefined) {
							WorkerEffectsVideoBus.callbackStats(<WorkerEffectsVideoBusOutputDataStats>payload.data);
						}
						break;
				}
			}
		};
	}

	/*
	 * Send
	 */
	public static sendCalc(data: WorkerEffectsVideoBusInputDataCalc): void {
		let buffers: ArrayBufferLike[] = [];

		if (data.splashes !== undefined) {
			buffers.push(data.splashes.buffer);
		}

		WorkerEffectsVideoBus.worker.postMessage(
			{
				cmd: WorkerEffectsVideoBusInputCmd.CALC,
				data: data,
			},
			buffers,
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

		WorkerEffectsVideoBus.worker.postMessage(
			{
				cmd: WorkerEffectsVideoBusInputCmd.CALC_HEIGHT_MAPS,
				data: {
					heightMapGrid: heightMapGrid,
					heightMapParticles: heightMapParticles,
				},
			},
			buffers,
		);
	}

	public static sendReport(data: GamingCanvasReport): void {
		WorkerEffectsVideoBus.worker.postMessage({
			cmd: WorkerEffectsVideoBusInputCmd.REPORT,
			data: data,
		});
	}

	public static sendSettings(data: WorkerEffectsVideoBusInputDataSettings): void {
		WorkerEffectsVideoBus.worker.postMessage({
			cmd: WorkerEffectsVideoBusInputCmd.SETTINGS,
			data: data,
		});
	}

	public static sendView(data: WorkerEffectsVideoBusInputDataView): void {
		WorkerEffectsVideoBus.worker.postMessage(
			{
				cmd: WorkerEffectsVideoBusInputCmd.VIEW,
				data: data,
			},
			[data.gridCameraEncoded, data.gridViewportEncoded],
		);
	}

	public static sendWorld(data: World): void {
		WorkerEffectsVideoBus.worker.postMessage({
			cmd: WorkerEffectsVideoBusInputCmd.WORLD,
			data: data,
		});
	}

	public static setCallbackStats(callbackStats: (data: WorkerEffectsVideoBusOutputDataStats) => void): void {
		WorkerEffectsVideoBus.callbackStats = callbackStats;
	}
}
