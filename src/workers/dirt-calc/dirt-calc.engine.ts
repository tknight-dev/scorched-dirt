import {
	WorkerDirtCalcBusInputCmd,
	WorkerDirtCalcBusInputDataInit,
	WorkerDirtCalcBusInputDataSettings,
	WorkerDirtCalcBusInputPayload,
	WorkerDirtCalcBusOutputCmd,
	WorkerDirtCalcBusOutputDataStats,
	WorkerDirtCalcBusOutputPayload,
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
		// case WorkerDirtCalcBusInputCmd.SETTINGS:
		// 	WorkerDirtCalcEngine.inputSettings(<WorkerDirtCalcBusInputDataSettings>payload.data);
		// 	break;
	}
};

class WorkerDirtCalcEngine {
	public static async initialize(data: WorkerDirtCalcBusInputDataInit): Promise<void> {
		// Stats
		// WorkerDirtCalcEngine.stats[WorkerDirtCalcBusStats.ALL] = new GamingCanvasStat(50);

		// Config: Settings
		// WorkerDirtCalcEngine.inputSettings(data as WorkerDirtCalcBusInputDataSettings);

		// Start
		WorkerDirtCalcEngine.post([
			{
				cmd: WorkerDirtCalcBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);

		// Start rendering thread
		// WorkerDirtCalcEngine.go__funcForward();
		// WorkerDirtCalcEngine.request = requestAnimationFrame(WorkerDirtCalcEngine.go);
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
	public static go(_timestampNow: number): void {}
	public static go__funcForward(): void {
		const go = (timestampNow: number) => {};
		WorkerDirtCalcEngine.go = go;
	}
}
