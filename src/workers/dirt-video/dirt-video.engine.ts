import { GamingCanvasReport, GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import { Map } from '../../models/map.model.js';
import {
	WorkerDirtVideoBusInputCmd,
	WorkerDirtVideoBusInputDataInit,
	WorkerDirtVideoBusInputDataMap,
	WorkerDirtVideoBusInputDataSettings,
	WorkerDirtVideoBusInputPayload,
	WorkerDirtVideoBusOutputCmd,
	WorkerDirtVideoBusOutputPayload,
	WorkerDirtVideoBusStats,
} from './dirt-video.model.js';

/**
 * @author tknight-dev
 */

/*
 * Input: from Main Thread
 */
self.onmessage = (event: MessageEvent) => {
	const payload: WorkerDirtVideoBusInputPayload = event.data;

	switch (payload.cmd) {
		case WorkerDirtVideoBusInputCmd.INIT:
			WorkerDirtVideoEngine.initialize(<WorkerDirtVideoBusInputDataInit>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.MAP:
			WorkerDirtVideoEngine.inputMap(<WorkerDirtVideoBusInputDataMap>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.SETTINGS:
			WorkerDirtVideoEngine.inputSettings(<WorkerDirtVideoBusInputDataSettings>payload.data);
			break;
	}
};

class WorkerDirtVideoEngine {
	private static animationFrameRequest: number;
	private static gamingCanvasReport: GamingCanvasReport;
	private static gridCamera: GamingCanvasGridCamera;
	private static gridViewport: GamingCanvasGridViewport;
	private static map: Map;
	private static mapNew: boolean;
	private static offscreenCanvas: OffscreenCanvas;
	private static offscreenCanvasContext: OffscreenCanvasRenderingContext2D;
	private static settings: WorkerDirtVideoBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};

	public static async initialize(data: WorkerDirtVideoBusInputDataInit): Promise<void> {
		gridCameraEncoded: Float64Array;
		gridViewportEncoded: Float64Array;

		// Config: Canvas
		WorkerDirtVideoEngine.offscreenCanvas = data.offscreenCanvas;
		WorkerDirtVideoEngine.offscreenCanvasContext = data.offscreenCanvas.getContext('2d', {
			alpha: true,
			antialias: false,
			depth: true,
			desynchronized: true,
			powerPreference: 'high-performance',
		}) as OffscreenCanvasRenderingContext2D;

		// Config: GamingCanvas
		WorkerDirtVideoEngine.gamingCanvasReport = data.gamingCanvasReport;

		// Config: Grid
		WorkerDirtVideoEngine.gridCamera = GamingCanvasGridCamera.from(data.gridCameraEncoded);
		WorkerDirtVideoEngine.gridViewport = GamingCanvasGridViewport.from(data.gridViewportEncoded);

		// Config: Map
		WorkerDirtVideoEngine.inputMap(data as WorkerDirtVideoBusInputDataMap);

		// Config: Settings
		WorkerDirtVideoEngine.inputSettings(data as WorkerDirtVideoBusInputDataSettings);

		// Stats
		WorkerDirtVideoEngine.stats[WorkerDirtVideoBusStats.ALL] = new GamingCanvasStat(50);

		// Done
		WorkerDirtVideoEngine.animationLoop();
		WorkerDirtVideoEngine.post([
			{
				cmd: WorkerDirtVideoBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);
	}

	/*
	 * Input
	 */
	public static inputMap(data: WorkerDirtVideoBusInputDataMap): void {
		WorkerDirtVideoEngine.map = data.map;
		WorkerDirtVideoEngine.mapNew = true;
	}

	public static inputSettings(data: WorkerDirtVideoBusInputDataSettings): void {
		WorkerDirtVideoEngine.settings = data;
		WorkerDirtVideoEngine.settingsNew = true;
	}

	/*
	 * Output: to Main Thread
	 */
	private static post(payloads: WorkerDirtVideoBusOutputPayload[], data?: Transferable[]): void {
		self.postMessage(payloads, (data || []) as any);
	}

	/*
	 * Main Loop
	 */
	private static animationLoop(): void {
		let frameCount: number = 0,
			gamingCanvasReport: GamingCanvasReport = WorkerDirtVideoEngine.gamingCanvasReport,
			gridCamera: GamingCanvasGridCamera = WorkerDirtVideoEngine.gridCamera,
			gridViewport: GamingCanvasGridViewport = WorkerDirtVideoEngine.gridViewport,
			offscreenCanvas: OffscreenCanvas = WorkerDirtVideoEngine.offscreenCanvas,
			offscreenCanvasContext: OffscreenCanvasRenderingContext2D = WorkerDirtVideoEngine.offscreenCanvasContext,
			settingsDebug: boolean,
			settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			settingsGammaCorrection: number,
			settingsGrayscale: boolean,
			statAll: GamingCanvasStat = WorkerDirtVideoEngine.stats[WorkerDirtVideoBusStats.ALL],
			statAllRaw: Float32Array,
			timestampDelta: number,
			timestampStats: number = performance.now(),
			timestampThen: number = performance.now();

		const go = (timestampNow: number) => {
			// Always start the request for the next frame first!
			WorkerDirtVideoEngine.animationFrameRequest = requestAnimationFrame(go);

			// Timing
			timestampDelta = timestampNow - timestampThen;

			// Settings
			if (WorkerDirtVideoEngine.settingsNew === true) {
				WorkerDirtVideoEngine.settingsNew = false;

				settingsDebug = WorkerDirtVideoEngine.settings.debug;
				settingsEdgesWrap = WorkerDirtVideoEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerDirtVideoEngine.settings.fps) * 1000) / 1000;
				settingsGammaCorrection = WorkerDirtVideoEngine.settings.gammaCorrection;
				settingsGrayscale = WorkerDirtVideoEngine.settings.grayscale;
			}

			// Animate
			if (timestampDelta > settingsFPMS) {
				// More accurately calculate for more stable FPS
				timestampThen = timestampNow - (timestampDelta % settingsFPMS);

				// Start
				statAll.watchStart();
				frameCount++;

				// Draw dirt

				// Done
				statAll.watchStop();
			}

			// Stats
			if (timestampNow - timestampStats > 999) {
				timestampStats = timestampNow;

				statAllRaw = <Float32Array>statAll.encode();

				// Output
				WorkerDirtVideoEngine.post(
					[
						{
							cmd: WorkerDirtVideoBusOutputCmd.STATS,
							data: {
								all: statAllRaw,
								fps: frameCount,
							},
						},
					],
					[statAllRaw.buffer],
				);
				frameCount = 0;
			}
		};

		WorkerDirtVideoEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
