import { GamingCanvas, GamingCanvasRenderStyle, GamingCanvasReport, GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridUint32Array, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import {
	particleEncodingMaskHealth,
	particleEncodingMaskType,
	particleEncodingMaskTypeValue,
	particleEncodingMaskX,
	particleEncodingMaskY,
	particleEncodingShiftHealth,
	particleEncodingShiftType,
	particleEncodingShiftTypeValue,
	particleEncodingShiftX,
	ParticleInitial,
	ParticleInitialBase,
	ParticleType,
} from '../../models/physics.model.js';
import { Tank } from '../../models/tank.model.js';
import { Weapon } from '../../models/weapon.model.js';
import { Solid, SolidType, World, worldEncodingMaskType } from '../../models/world.model.js';
import { WorkerMainCalcBusOutputData } from '../main-calc/main-calc.model.js';
import {
	WorkerGridVideoBusInputCmd,
	WorkerGridVideoBusInputDataInit,
	WorkerGridVideoBusInputDataSettings,
	WorkerGridVideoBusInputDataView,
	WorkerGridVideoBusInputPayload,
	WorkerGridVideoBusOutputCmd,
	WorkerGridVideoBusOutputPayload,
	WorkerGridVideoBusStats,
} from './grid-video.model.js';

/**
 * @author tknight-dev
 */

/*
 * Input: from Main Thread
 */
self.onmessage = (event: MessageEvent) => {
	const payload: WorkerGridVideoBusInputPayload = event.data;

	switch (payload.cmd) {
		case WorkerGridVideoBusInputCmd.CALC:
			WorkerGridVideoEngine.inputCalc(<GamingCanvasGridUint32Array>payload.data);
			break;
		case WorkerGridVideoBusInputCmd.INIT:
			WorkerGridVideoEngine.initialize(<WorkerGridVideoBusInputDataInit>payload.data);
			break;
		case WorkerGridVideoBusInputCmd.REPORT:
			WorkerGridVideoEngine.inputReport(<GamingCanvasReport>payload.data);
			break;
		case WorkerGridVideoBusInputCmd.SETTINGS:
			WorkerGridVideoEngine.inputSettings(<WorkerGridVideoBusInputDataSettings>payload.data);
			break;
		case WorkerGridVideoBusInputCmd.VIEW:
			WorkerGridVideoEngine.inputView(<WorkerGridVideoBusInputDataView>payload.data);
			break;
		case WorkerGridVideoBusInputCmd.WORLD:
			WorkerGridVideoEngine.inputWorld(<World>payload.data);
			break;
	}
};

class WorkerGridVideoEngine {
	private static animationFrameRequest: number;
	private static calcGrid: GamingCanvasGridUint32Array;
	private static calcNew: boolean;
	private static world: World;
	private static worldNew: boolean;
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
	private static settings: WorkerGridVideoBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};
	private static view: WorkerGridVideoBusInputDataView;
	private static viewNew: boolean;

	public static async initialize(data: WorkerGridVideoBusInputDataInit): Promise<void> {
		// Config: Canvas
		WorkerGridVideoEngine.offscreenCanvas = data.offscreenCanvas;
		WorkerGridVideoEngine.offscreenCanvasContext = data.offscreenCanvas.getContext(
			'2d',
			WorkerGridVideoEngine.offscreenCanvasContextOptions,
		) as OffscreenCanvasRenderingContext2D;

		// Config
		WorkerGridVideoEngine.inputReport(data.report);
		WorkerGridVideoEngine.inputWorld(data.world);
		WorkerGridVideoEngine.inputSettings(data as WorkerGridVideoBusInputDataSettings);
		WorkerGridVideoEngine.inputView(data as WorkerGridVideoBusInputDataView);

		// Stats
		WorkerGridVideoEngine.stats[WorkerGridVideoBusStats.ALL] = new GamingCanvasStat(50);

		// Done
		WorkerGridVideoEngine.animationLoop();
		WorkerGridVideoEngine.post([
			{
				cmd: WorkerGridVideoBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);
	}

	/*
	 * Input
	 */
	public static inputCalc(data: GamingCanvasGridUint32Array): void {
		WorkerGridVideoEngine.calcGrid = GamingCanvasGridUint32Array.from(data.data);
		WorkerGridVideoEngine.calcNew = true;
	}

	public static inputWorld(data: World): void {
		WorkerGridVideoEngine.world = data;
		WorkerGridVideoEngine.world.grid = GamingCanvasGridUint32Array.from(data.grid.data);
		WorkerGridVideoEngine.worldNew = true;
	}

	public static inputReport(data: GamingCanvasReport): void {
		WorkerGridVideoEngine.report = data;
		WorkerGridVideoEngine.reportNew = true;
	}

	public static inputSettings(data: WorkerGridVideoBusInputDataSettings): void {
		WorkerGridVideoEngine.settings = data;
		WorkerGridVideoEngine.settingsNew = true;
	}

	public static inputView(data: WorkerGridVideoBusInputDataView): void {
		WorkerGridVideoEngine.view = data;
		WorkerGridVideoEngine.viewNew = true;
	}

	/*
	 * Output: to Main Thread
	 */
	private static post(payloads: WorkerGridVideoBusOutputPayload[], data?: Transferable[]): void {
		self.postMessage(payloads, (data || []) as any);
	}

	/*
	 * Main Loop
	 */
	private static animationLoop(): void {
		let cacheGrid: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheGridContext: OffscreenCanvasRenderingContext2D = cacheGrid.getContext(
				'2d',
				WorkerGridVideoEngine.offscreenCanvasContextOptions,
			) as OffscreenCanvasRenderingContext2D,
			cacheUpdate: boolean,
			cacheParticles: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheParticlesContext: OffscreenCanvasRenderingContext2D = cacheParticles.getContext(
				'2d',
				WorkerGridVideoEngine.offscreenCanvasContextOptions,
			) as OffscreenCanvasRenderingContext2D,
			cacheParticlesUpdate: boolean,
			frameCount: number = 0,
			grid: GamingCanvasGridUint32Array,
			gridCamera: GamingCanvasGridCamera = new GamingCanvasGridCamera(),
			gridData: Uint32Array,
			gridDataValue: number,
			gridIndex: number,
			gridSideLength: number,
			gridViewport: GamingCanvasGridViewport = new GamingCanvasGridViewport(1),
			gridViewportCellSizePx: number,
			gridViewportHeightStart: number,
			gridViewportHeightStartEff: number,
			gridViewportHeightStartPx: number,
			gridViewportHeightStopEff: number,
			gridViewportWidthStart: number,
			gridViewportWidthStartEff: number,
			gridViewportWidthStartPx: number,
			gridViewportWidthStopEff: number,
			gridYLimit: number,
			health: number,
			i: number,
			offscreenCanvas: OffscreenCanvas = WorkerGridVideoEngine.offscreenCanvas,
			offscreenCanvasContext: OffscreenCanvasRenderingContext2D = WorkerGridVideoEngine.offscreenCanvasContext,
			offscreenCanvasHeightPx: number = -1,
			offscreenCanvasWidthPx: number = -1,
			particleInitialBase: ParticleInitialBase,
			particlesEncoded: Uint32Array,
			particlesSolid: Map<number, ParticleInitialBase> = new Map(),
			particlesTank: Map<number, ParticleInitialBase> = new Map(),
			particlesWeapon: Map<number, ParticleInitialBase> = new Map(),
			report: GamingCanvasReport = WorkerGridVideoEngine.report,
			settingsDebug: boolean,
			settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			settingsGammaCorrection: number,
			settingsGrayscale: boolean,
			settingsRenderStyle: GamingCanvasRenderStyle,
			statAll: GamingCanvasStat = WorkerGridVideoEngine.stats[WorkerGridVideoBusStats.ALL],
			statAllRaw: Float32Array,
			timestampDelta: number,
			timestampStats: number = performance.now(),
			timestampThen: number = performance.now(),
			world: World,
			x: number,
			y: number,
			y1: number = -10,
			y2: number = -10,
			yMax: number,
			yType: number = -10;

		const go = (timestampNow: number) => {
			// Always start the request for the next frame first!
			WorkerGridVideoEngine.animationFrameRequest = requestAnimationFrame(go);

			// Timing
			timestampDelta = timestampNow - timestampThen;

			// Config
			if (WorkerGridVideoEngine.calcNew === true) {
				WorkerGridVideoEngine.calcNew = false;

				cacheUpdate = true;
				grid = WorkerGridVideoEngine.calcGrid;
				gridData = grid.data;
				gridSideLength = grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;
			}

			if (WorkerGridVideoEngine.worldNew === true) {
				WorkerGridVideoEngine.worldNew = false;
				cacheUpdate = true;

				// Grid
				grid = WorkerGridVideoEngine.world.grid;
				gridData = grid.data;
				gridSideLength = grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;

				// Grid: Remove liquids (these are particles only)
				for (x = 0; x < gridSideLength; x++) {
					for (y = 0; y < gridSideLength; y++) {
						gridIndex = x * gridSideLength + y;
						yType = gridData[gridIndex] & worldEncodingMaskType;

						if (yType === SolidType.LAVA || yType === SolidType.WATER) {
							gridData[gridIndex] = 0;
						}
					}
				}

				world = WorkerGridVideoEngine.world;
			}

			if (WorkerGridVideoEngine.settingsNew === true) {
				WorkerGridVideoEngine.settingsNew = false;
				cacheUpdate = true;

				settingsDebug = WorkerGridVideoEngine.settings.debug;
				settingsEdgesWrap = WorkerGridVideoEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerGridVideoEngine.settings.fps) * 1000) / 1000;
				settingsGammaCorrection = WorkerGridVideoEngine.settings.gammaCorrection;
				settingsGrayscale = WorkerGridVideoEngine.settings.grayscale;
				settingsRenderStyle = WorkerGridVideoEngine.settings.renderStyle;
			}

			if (WorkerGridVideoEngine.reportNew === true) {
				WorkerGridVideoEngine.reportNew = false;
				cacheUpdate = true;

				report = WorkerGridVideoEngine.report;
				if (offscreenCanvasHeightPx !== report.canvasHeight || offscreenCanvasWidthPx !== report.canvasWidth) {
					offscreenCanvasHeightPx = report.canvasHeight;
					offscreenCanvasWidthPx = report.canvasWidth;

					cacheGrid.height = offscreenCanvasHeightPx;
					cacheGrid.width = offscreenCanvasWidthPx;
					cacheParticles.height = offscreenCanvasHeightPx;
					cacheParticles.width = offscreenCanvasWidthPx;
					offscreenCanvas.height = offscreenCanvasHeightPx;
					offscreenCanvas.width = offscreenCanvasWidthPx;

					GamingCanvas.renderStyle([cacheGridContext, cacheParticlesContext, offscreenCanvasContext], settingsRenderStyle);
				}
			}

			if (WorkerGridVideoEngine.viewNew === true) {
				WorkerGridVideoEngine.viewNew = false;
				cacheUpdate = true;

				// Camera
				gridCamera.decode(WorkerGridVideoEngine.view.gridCameraEncoded);

				// Viewport
				gridViewport.decode(WorkerGridVideoEngine.view.gridViewportEncoded);
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

				cacheGridContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);
				cacheGridContext.globalAlpha = 1;
				yMax = Math.min(gridYLimit + 1, gridViewportHeightStopEff);

				// Draw: Base Pass
				for (x = gridViewportWidthStartEff; x < gridViewportWidthStopEff; x++) {
					gridIndex = x * gridSideLength;
					y1 = -10;
					y2 = -10;
					yType = -10;

					for (y = gridViewportHeightStartEff; y <= yMax; gridIndex++, y++) {
						// Draw segments of dirt instead of individual pixels

						if (gridData[gridIndex] !== 0 && y !== yMax) {
							// Draw previous segment type
							if (yType !== (gridData[gridIndex] & worldEncodingMaskType)) {
								if (y2 === -10) {
									cacheGridContext.fillRect(
										(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
										(y1 - gridViewportHeightStartEff) * gridViewportCellSizePx,
										gridViewportCellSizePx,
										gridViewportCellSizePx,
									);
								} else {
									cacheGridContext.fillRect(
										(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
										(y1 - gridViewportHeightStartEff) * gridViewportCellSizePx,
										gridViewportCellSizePx,
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
								yType = gridData[gridIndex] & worldEncodingMaskType;

								switch (yType) {
									case SolidType.DIRT:
										cacheGridContext.fillStyle = '#905015';
										break;
									case SolidType.LAVA:
										cacheGridContext.fillStyle = '#ee0000';
										break;
									case SolidType.ROCK:
										cacheGridContext.fillStyle = '#505050';
										break;
									case SolidType.WATER:
										cacheGridContext.fillStyle = '#0000ee';
										break;
								}
							} else {
								y2 = y;
							}
						} else if (y1 !== -10) {
							// Draw current segment type
							if (y2 === -10) {
								cacheGridContext.fillRect(
									(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
									(y1 - gridViewportHeightStartEff) * gridViewportCellSizePx,
									gridViewportCellSizePx,
									gridViewportCellSizePx,
								);
							} else {
								cacheGridContext.fillRect(
									(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
									(y1 - gridViewportHeightStartEff) * gridViewportCellSizePx,
									gridViewportCellSizePx,
									gridViewportCellSizePx * (y2 - y1) + 1,
								);
							}

							y1 = -10;
							y2 = -10;
							yType = -10;
						}
					}
				}

				// Draw: Highlight
				cacheGridContext.fillStyle = '#ffffff';
				for (x = gridViewportWidthStartEff; x < gridViewportWidthStopEff; x++) {
					gridIndex = x * gridSideLength;

					for (y = 0; y < gridYLimit; y++) {
						gridDataValue = gridData[gridIndex + y];

						if (gridDataValue === 0) {
							continue;
						}

						// Hightlight
						cacheGridContext.globalAlpha = 0.1;
						for (i = 0; i < 3; i++) {
							gridDataValue = gridData[gridIndex + y + i];

							if (gridDataValue !== 0) {
								cacheGridContext.fillRect(
									(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
									(y - gridViewportHeightStartEff + i) * gridViewportCellSizePx,
									gridViewportCellSizePx,
									gridViewportCellSizePx,
								);

								cacheGridContext.globalAlpha /= 2;
							} else {
								break;
							}
						}
						break;
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
				offscreenCanvasContext.drawImage(cacheGrid, 0, 0);
				offscreenCanvasContext.drawImage(cacheParticles, 0, 0);

				// Done
				statAll.watchStop();
			}

			// Stats
			if (timestampNow - timestampStats > 999) {
				timestampStats = timestampNow;

				statAllRaw = <Float32Array>statAll.encode();

				// Output
				WorkerGridVideoEngine.post(
					[
						{
							cmd: WorkerGridVideoBusOutputCmd.STATS,
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

		WorkerGridVideoEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
