import {
	WorkerDirtVideoBusInputCmd,
	WorkerDirtVideoBusInputDataInit,
	WorkerDirtVideoBusInputDataSettings,
	WorkerDirtVideoBusInputPayload,
	WorkerDirtVideoBusOutputCmd,
	WorkerDirtVideoBusOutputDataStats,
	WorkerDirtVideoBusOutputPayload,
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
		// case WorkerDirtVideoBusInputCmd.SETTINGS:
		// 	WorkerDirtVideoEngine.inputSettings(<WorkerDirtVideoBusInputDataSettings>payload.data);
		// 	break;
	}
};

class WorkerDirtVideoEngine {
	public static async initialize(data: WorkerDirtVideoBusInputDataInit): Promise<void> {
		// Stats
		// WorkerDirtVideoEngine.stats[WorkerDirtVideoBusStats.ALL] = new GamingCanvasStat(50);

		// Config: Settings
		// WorkerDirtVideoEngine.inputSettings(data as WorkerDirtVideoBusInputDataSettings);

		// Start
		WorkerDirtVideoEngine.post([
			{
				cmd: WorkerDirtVideoBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);

		// Start rendering thread
		// WorkerDirtVideoEngine.go__funcForward();
		// WorkerDirtVideoEngine.request = requestAnimationFrame(WorkerDirtVideoEngine.go);
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
	public static go(_timestampNow: number): void {}
	public static go__funcForward(): void {
		const go = (timestampNow: number) => {};
		WorkerDirtVideoEngine.go = go;
	}
}
