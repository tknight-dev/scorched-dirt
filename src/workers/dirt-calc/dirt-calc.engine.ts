import { GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { Map } from '../../models/map.model.js';
import {
	WorkerDirtCalcBusInputCmd,
	WorkerDirtCalcBusInputDataInit,
	WorkerDirtCalcBusInputDataMap,
	WorkerDirtCalcBusInputDataSettings,
	WorkerDirtCalcBusInputPayload,
	WorkerDirtCalcBusOutputCmd,
	WorkerDirtCalcBusOutputPayload,
	WorkerDirtCalcBusStats,
} from './dirt-calc.model.js';

/**
 * @author tknight-dev
 */

/*
 * Input: from Main Thread
 */
self.onmessage = (event: MessageEvent) => {
	const payload: WorkerDirtCalcBusInputPayload = event.data;

	switch (payload.cmd) {
		case WorkerDirtCalcBusInputCmd.INIT:
			WorkerDirtCalcEngine.initialize(<WorkerDirtCalcBusInputDataInit>payload.data);
			break;
		case WorkerDirtCalcBusInputCmd.MAP:
			WorkerDirtCalcEngine.inputMap(<WorkerDirtCalcBusInputDataMap>payload.data);
			break;
		case WorkerDirtCalcBusInputCmd.SETTINGS:
			WorkerDirtCalcEngine.inputSettings(<WorkerDirtCalcBusInputDataSettings>payload.data);
			break;
	}
};

class WorkerDirtCalcEngine {
	private static animationFrameRequest: number;
	private static map: Map;
	private static mapNew: boolean;
	private static settings: WorkerDirtCalcBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};

	public static async initialize(data: WorkerDirtCalcBusInputDataInit): Promise<void> {
		// Stats
		WorkerDirtCalcEngine.stats[WorkerDirtCalcBusStats.ALL] = new GamingCanvasStat(50);

		// Config: Map
		WorkerDirtCalcEngine.inputMap(data as WorkerDirtCalcBusInputDataMap);

		// Config: Settings
		WorkerDirtCalcEngine.inputSettings(data as WorkerDirtCalcBusInputDataSettings);

		// Done
		WorkerDirtCalcEngine.animationLoop();
		WorkerDirtCalcEngine.post([
			{
				cmd: WorkerDirtCalcBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);
	}

	/*
	 * Input
	 */
	public static inputMap(data: WorkerDirtCalcBusInputDataMap): void {
		WorkerDirtCalcEngine.map = data.map;
		WorkerDirtCalcEngine.mapNew = true;
	}

	public static inputSettings(data: WorkerDirtCalcBusInputDataSettings): void {
		WorkerDirtCalcEngine.settings = data;
		WorkerDirtCalcEngine.settingsNew = true;
	}

	/*
	 * Output: to Main Thread
	 */
	private static post(payloads: WorkerDirtCalcBusOutputPayload[], data?: Transferable[]): void {
		self.postMessage(payloads, (data || []) as any);
	}

	/*
	 * Main Loop
	 */
	private static animationLoop(): void {
		let settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			statAll: GamingCanvasStat = WorkerDirtCalcEngine.stats[WorkerDirtCalcBusStats.ALL],
			statAllRaw: Float32Array,
			timestampDelta: number,
			timestampStats: number = performance.now(),
			timestampThen: number = performance.now();

		const go = (timestampNow: number) => {
			// Always start the request for the next frame first!
			WorkerDirtCalcEngine.animationFrameRequest = requestAnimationFrame(go);

			// Timing
			timestampDelta = timestampNow - timestampThen;

			// Settings
			if (WorkerDirtCalcEngine.settingsNew === true) {
				WorkerDirtCalcEngine.settingsNew = false;

				settingsEdgesWrap = WorkerDirtCalcEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerDirtCalcEngine.settings.fps) * 1000) / 1000;
			}

			// Animate
			if (timestampDelta > settingsFPMS) {
				// More accurately calculate for more stable FPS
				timestampThen = timestampNow - (timestampDelta % settingsFPMS);

				// Start
				statAll.watchStart();

				// Calc

				// Done
				statAll.watchStop();
			}

			// Stats
			if (timestampNow - timestampStats > 999) {
				timestampStats = timestampNow;

				statAllRaw = <Float32Array>statAll.encode();

				// Output
				WorkerDirtCalcEngine.post(
					[
						{
							cmd: WorkerDirtCalcBusOutputCmd.STATS,
							data: {
								all: statAllRaw,
							},
						},
					],
					[statAllRaw.buffer],
				);
			}
		};

		WorkerDirtCalcEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
