import { GamingCanvas, GamingCanvasRenderStyle, GamingCanvasReport, GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridUint8ClampedArray, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import { Map, mapGridMaskActive, mapGridMaskType, Solid } from '../../models/map.model.js';
import { WorkerDirtCalcBusOutputData } from '../dirt-calc/dirt-calc.model.js';
import {
	WorkerDirtVideoBusInputCmd,
	WorkerDirtVideoBusInputDataInit,
	WorkerDirtVideoBusInputDataSettings,
	WorkerDirtVideoBusInputDataView,
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
		case WorkerDirtVideoBusInputCmd.CALC:
			WorkerDirtVideoEngine.inputCalc(<WorkerDirtCalcBusOutputData>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.INIT:
			WorkerDirtVideoEngine.initialize(<WorkerDirtVideoBusInputDataInit>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.MAP:
			WorkerDirtVideoEngine.inputMap(<Map>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.REPORT:
			WorkerDirtVideoEngine.inputReport(<GamingCanvasReport>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.SETTINGS:
			WorkerDirtVideoEngine.inputSettings(<WorkerDirtVideoBusInputDataSettings>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.VIEW:
			WorkerDirtVideoEngine.inputView(<WorkerDirtVideoBusInputDataView>payload.data);
			break;
	}
};

class WorkerDirtVideoEngine {
	private static animationFrameRequest: number;
	private static calc: WorkerDirtCalcBusOutputData;
	private static calcNew: boolean;
	private static map: Map;
	private static mapNew: boolean;
	private static offscreenCanvas: OffscreenCanvas;
	private static offscreenCanvasContext: OffscreenCanvasRenderingContext2D;
	private static offscreenCanvasContextOptions: any = {
		alpha: true,
		antialias: false,
		depth: true,
		desynchronized: true,
		powerPreference: 'high-performance',
	};
	private static report: GamingCanvasReport;
	private static reportNew: boolean;
	private static settings: WorkerDirtVideoBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};
	private static view: WorkerDirtVideoBusInputDataView;
	private static viewNew: boolean;

	public static async initialize(data: WorkerDirtVideoBusInputDataInit): Promise<void> {
		gridCameraEncoded: Float64Array;
		gridViewportEncoded: Float64Array;

		// Config: Canvas
		WorkerDirtVideoEngine.offscreenCanvas = data.offscreenCanvas;
		WorkerDirtVideoEngine.offscreenCanvasContext = data.offscreenCanvas.getContext(
			'2d',
			WorkerDirtVideoEngine.offscreenCanvasContextOptions,
		) as OffscreenCanvasRenderingContext2D;

		// Config
		WorkerDirtVideoEngine.inputReport(data.report);
		WorkerDirtVideoEngine.inputMap(data.map);
		WorkerDirtVideoEngine.inputSettings(data as WorkerDirtVideoBusInputDataSettings);
		WorkerDirtVideoEngine.inputView(data as WorkerDirtVideoBusInputDataView);

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
	public static inputCalc(data: WorkerDirtCalcBusOutputData): void {
		WorkerDirtVideoEngine.calc = data;
		WorkerDirtVideoEngine.calc.grid = GamingCanvasGridUint8ClampedArray.from(data.grid.data);
		WorkerDirtVideoEngine.calcNew = true;
	}

	public static inputMap(data: Map): void {
		WorkerDirtVideoEngine.map = data;
		WorkerDirtVideoEngine.map.grid = GamingCanvasGridUint8ClampedArray.from(data.grid.data);
		WorkerDirtVideoEngine.mapNew = true;
	}

	public static inputReport(data: GamingCanvasReport): void {
		WorkerDirtVideoEngine.report = data;
		WorkerDirtVideoEngine.reportNew = true;
	}

	public static inputSettings(data: WorkerDirtVideoBusInputDataSettings): void {
		WorkerDirtVideoEngine.settings = data;
		WorkerDirtVideoEngine.settingsNew = true;
	}

	public static inputView(data: WorkerDirtVideoBusInputDataView): void {
		WorkerDirtVideoEngine.view = data;
		WorkerDirtVideoEngine.viewNew = true;
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
		let cacheDirtInactive: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheDirtInactiveContext: OffscreenCanvasRenderingContext2D = cacheDirtInactive.getContext(
				'2d',
				WorkerDirtVideoEngine.offscreenCanvasContextOptions,
			) as OffscreenCanvasRenderingContext2D,
			cacheUpdate: boolean,
			frameCount: number = 0,
			grid: GamingCanvasGridUint8ClampedArray,
			gridCamera: GamingCanvasGridCamera = new GamingCanvasGridCamera(),
			gridData: Uint8ClampedArray,
			gridDataValue: number,
			gridIndex: number,
			gridSideLength: number,
			gridViewport: GamingCanvasGridViewport = new GamingCanvasGridViewport(1),
			gridViewportCellSizePx: number,
			gridViewportCellSizePxEff: number,
			gridViewportHeightStart: number,
			gridViewportHeightStartEff: number,
			gridViewportHeightStartPx: number,
			gridViewportHeightStopEff: number,
			gridViewportWidthStart: number,
			gridViewportWidthStartEff: number,
			gridViewportWidthStartPx: number,
			gridViewportWidthStopEff: number,
			gridYLimit: number,
			map: Map,
			offscreenCanvas: OffscreenCanvas = WorkerDirtVideoEngine.offscreenCanvas,
			offscreenCanvasContext: OffscreenCanvasRenderingContext2D = WorkerDirtVideoEngine.offscreenCanvasContext,
			offscreenCanvasHeightPx: number = -1,
			offscreenCanvasWidthPx: number = -1,
			report: GamingCanvasReport = WorkerDirtVideoEngine.report,
			settingsDebug: boolean,
			settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			settingsGammaCorrection: number,
			settingsGrayscale: boolean,
			settingsRenderStyle: GamingCanvasRenderStyle,
			statAll: GamingCanvasStat = WorkerDirtVideoEngine.stats[WorkerDirtVideoBusStats.ALL],
			statAllRaw: Float32Array,
			timestampDelta: number,
			timestampStats: number = performance.now(),
			timestampThen: number = performance.now(),
			x: number,
			y: number,
			y1: number = -10,
			y2: number = -10,
			yMax: number,
			yType: number = -10;

		const go = (timestampNow: number) => {
			// Always start the request for the next frame first!
			WorkerDirtVideoEngine.animationFrameRequest = requestAnimationFrame(go);

			// Timing
			timestampDelta = timestampNow - timestampThen;

			// Config
			if (WorkerDirtVideoEngine.calcNew === true) {
				WorkerDirtVideoEngine.calcNew = false;

				cacheUpdate = true;
				grid = WorkerDirtVideoEngine.calc.grid;
				gridData = grid.data;
				gridSideLength = grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;
			}

			if (WorkerDirtVideoEngine.mapNew === true) {
				WorkerDirtVideoEngine.mapNew = false;

				// Grid
				grid = WorkerDirtVideoEngine.map.grid;
				gridData = grid.data;
				gridSideLength = grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;

				map = WorkerDirtVideoEngine.map;
			}

			if (WorkerDirtVideoEngine.settingsNew === true) {
				WorkerDirtVideoEngine.settingsNew = false;
				cacheUpdate = true;

				settingsDebug = WorkerDirtVideoEngine.settings.debug;
				settingsEdgesWrap = WorkerDirtVideoEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerDirtVideoEngine.settings.fps) * 1000) / 1000;
				settingsGammaCorrection = WorkerDirtVideoEngine.settings.gammaCorrection;
				settingsGrayscale = WorkerDirtVideoEngine.settings.grayscale;
				settingsRenderStyle = WorkerDirtVideoEngine.settings.renderStyle;
			}

			if (WorkerDirtVideoEngine.reportNew === true) {
				WorkerDirtVideoEngine.reportNew = false;
				cacheUpdate = true;

				report = WorkerDirtVideoEngine.report;
				if (offscreenCanvasHeightPx !== report.canvasHeight || offscreenCanvasWidthPx !== report.canvasWidth) {
					offscreenCanvasHeightPx = report.canvasHeight;
					offscreenCanvasWidthPx = report.canvasWidth;

					cacheDirtInactive.height = offscreenCanvasHeightPx;
					cacheDirtInactive.width = offscreenCanvasWidthPx;
					offscreenCanvas.height = offscreenCanvasHeightPx;
					offscreenCanvas.width = offscreenCanvasWidthPx;

					GamingCanvas.renderStyle([cacheDirtInactiveContext, offscreenCanvasContext], settingsRenderStyle);
				}
			}

			if (WorkerDirtVideoEngine.viewNew === true) {
				WorkerDirtVideoEngine.viewNew = false;
				cacheUpdate = true;

				// Camera
				gridCamera.decode(WorkerDirtVideoEngine.view.gridCameraEncoded);

				// Viewport
				gridViewport.decode(WorkerDirtVideoEngine.view.gridViewportEncoded);
				gridViewportCellSizePx = gridViewport.cellSizePx;
				gridViewportHeightStart = gridViewport.heightStart;
				gridViewportHeightStartEff = Math.max(0, (gridViewportHeightStart - 1) | 0);
				gridViewportHeightStartPx = gridViewport.heightStartPx;
				gridViewportHeightStopEff = Math.min(gridSideLength, (gridViewport.heightStop + 1) | 0);
				gridViewportWidthStart = gridViewport.widthStart;
				gridViewportWidthStartEff = Math.max(0, (gridViewportWidthStart - 1) | 0);
				gridViewportWidthStartPx = gridViewport.widthStartPx;
				gridViewportWidthStopEff = Math.min(gridSideLength * gridSideLength, (gridViewport.widthStop + 1) | 0);
			}

			// Cache
			if (cacheUpdate === true) {
				cacheUpdate = false;

				gridViewportCellSizePxEff = gridViewportCellSizePx + 1;
				gridViewportCellSizePxEff = 2;

				// Draw: Dirt Inactive
				cacheDirtInactiveContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);
				for (x = gridViewportWidthStartEff; x < gridViewportWidthStopEff; x++) {
					gridIndex = x * gridSideLength;
					y1 = -10;
					y2 = -10;
					yMax = Math.min(gridYLimit, gridViewportHeightStopEff);
					yType = -10;

					for (y = gridViewportHeightStartEff; y <= yMax; gridIndex++, y++) {
						// Draw segments of dirt instead of individual pixels

						if ((gridData[gridIndex] & mapGridMaskActive) !== 0 && y !== yMax) {
							// Draw previous segment type
							if (yType !== (gridData[gridIndex] & mapGridMaskType)) {
								if (y2 === -10) {
									cacheDirtInactiveContext.fillRect(
										(x - gridViewportWidthStart) * gridViewportCellSizePx,
										(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
										gridViewportCellSizePxEff,
										gridViewportCellSizePxEff,
									);
								} else {
									cacheDirtInactiveContext.fillRect(
										(x - gridViewportWidthStart) * gridViewportCellSizePx,
										(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
										gridViewportCellSizePxEff,
										gridViewportCellSizePx * (y2 - y1) + 1,
									);
								}

								y1 = -10;
								y2 = -10;
								yType = -10;
							}

							// Start new segment type
							if (y1 === -10) {
								y1 = y;
								yType = gridData[gridIndex] & mapGridMaskType;

								switch (yType) {
									case Solid.DIRT:
										cacheDirtInactiveContext.fillStyle = '#905015';
										break;
									case Solid.LAVA:
										cacheDirtInactiveContext.fillStyle = '#ff0000';
										break;
									case Solid.ROCK:
										cacheDirtInactiveContext.fillStyle = '#505050';
										break;
									case Solid.WATER:
										cacheDirtInactiveContext.fillStyle = '#0000ff';
										break;
								}
							} else {
								y2 = y;
							}
						} else if (y1 !== -10) {
							// Draw current segment type
							if (y2 === -10) {
								cacheDirtInactiveContext.fillRect(
									(x - gridViewportWidthStart) * gridViewportCellSizePx,
									(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
									gridViewportCellSizePxEff,
									gridViewportCellSizePxEff,
								);
							} else {
								cacheDirtInactiveContext.fillRect(
									(x - gridViewportWidthStart) * gridViewportCellSizePx,
									(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
									gridViewportCellSizePxEff,
									gridViewportCellSizePx * (y2 - y1) + 1,
								);
							}

							y1 = -10;
							y2 = -10;
							yType = -10;
						}
					}
				}
			}

			// Animate
			if (timestampDelta >= settingsFPMS) {
				// More accurately calculate for more stable FPS
				timestampThen = timestampNow - (timestampDelta % settingsFPMS);

				// Start
				statAll.watchStart();
				frameCount++;
				offscreenCanvasContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);

				// Draw: Dirt Inactive
				offscreenCanvasContext.drawImage(cacheDirtInactive, 0, 0);

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
