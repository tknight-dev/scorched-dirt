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
		case WorkerDirtVideoBusInputCmd.REPORT:
			WorkerDirtVideoEngine.inputReport(<GamingCanvasReport>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.SETTINGS:
			WorkerDirtVideoEngine.inputSettings(<WorkerDirtVideoBusInputDataSettings>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.VIEW:
			WorkerDirtVideoEngine.inputView(<WorkerDirtVideoBusInputDataView>payload.data);
			break;
		case WorkerDirtVideoBusInputCmd.WORLD:
			WorkerDirtVideoEngine.inputWorld(<World>payload.data);
			break;
	}
};

class WorkerDirtVideoEngine {
	private static animationFrameRequest: number;
	private static calcGrid: GamingCanvasGridUint32Array | undefined;
	private static calcParticles: Uint32Array | undefined;
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
	private static settings: WorkerDirtVideoBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};
	private static view: WorkerDirtVideoBusInputDataView;
	private static viewNew: boolean;

	public static async initialize(data: WorkerDirtVideoBusInputDataInit): Promise<void> {
		// Config: Canvas
		WorkerDirtVideoEngine.offscreenCanvas = data.offscreenCanvas;
		WorkerDirtVideoEngine.offscreenCanvasContext = data.offscreenCanvas.getContext(
			'2d',
			WorkerDirtVideoEngine.offscreenCanvasContextOptions,
		) as OffscreenCanvasRenderingContext2D;

		// Config
		WorkerDirtVideoEngine.inputReport(data.report);
		WorkerDirtVideoEngine.inputWorld(data.world);
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
		if (data.grid !== undefined) {
			WorkerDirtVideoEngine.calcGrid = GamingCanvasGridUint32Array.from(data.grid.data);
		} else {
			WorkerDirtVideoEngine.calcGrid = undefined;
		}
		WorkerDirtVideoEngine.calcParticles = data.particles;

		WorkerDirtVideoEngine.calcNew = true;
	}

	public static inputWorld(data: World): void {
		WorkerDirtVideoEngine.world = data;
		WorkerDirtVideoEngine.world.grid = GamingCanvasGridUint32Array.from(data.grid.data);
		WorkerDirtVideoEngine.worldNew = true;
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
		let cacheGrid: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheGridContext: OffscreenCanvasRenderingContext2D = cacheGrid.getContext(
				'2d',
				WorkerDirtVideoEngine.offscreenCanvasContextOptions,
			) as OffscreenCanvasRenderingContext2D,
			cacheGridUpdate: boolean,
			cacheParticles: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheParticlesContext: OffscreenCanvasRenderingContext2D = cacheParticles.getContext(
				'2d',
				WorkerDirtVideoEngine.offscreenCanvasContextOptions,
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
			health: number,
			i: number,
			offscreenCanvas: OffscreenCanvas = WorkerDirtVideoEngine.offscreenCanvas,
			offscreenCanvasContext: OffscreenCanvasRenderingContext2D = WorkerDirtVideoEngine.offscreenCanvasContext,
			offscreenCanvasHeightPx: number = -1,
			offscreenCanvasWidthPx: number = -1,
			particleInitialBase: ParticleInitialBase,
			particlesEncoded: Uint32Array,
			particlesSolid: Map<number, ParticleInitialBase> = new Map(),
			particlesTank: Map<number, ParticleInitialBase> = new Map(),
			particlesWeapon: Map<number, ParticleInitialBase> = new Map(),
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
			world: World,
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

				if (WorkerDirtVideoEngine.calcGrid !== undefined) {
					cacheGridUpdate = true;
					grid = WorkerDirtVideoEngine.calcGrid;
					gridData = grid.data;
					gridSideLength = grid.sideLength;
					gridYLimit = (gridSideLength * 9) / 16;
				}

				if (WorkerDirtVideoEngine.calcParticles !== undefined) {
					cacheParticlesUpdate = true;
					particlesEncoded = WorkerDirtVideoEngine.calcParticles;
					particlesSolid.clear();
					particlesWeapon.clear();

					// Decode
					for (i = 0; i < particlesEncoded.length; i++) {
						x = (particlesEncoded[i] & particleEncodingMaskX) >> particleEncodingShiftX;
						y = particlesEncoded[i] & particleEncodingMaskY;

						// Calc
						gridIndex = x * gridSideLength + y;
						particleInitialBase = {
							health: (particlesEncoded[i] & particleEncodingMaskHealth) >> particleEncodingShiftHealth,
							type: ParticleType.SOLID,
							typeValue: (particlesEncoded[i] & particleEncodingMaskTypeValue) >> particleEncodingShiftTypeValue,
						};

						// Set
						switch ((particlesEncoded[i] & particleEncodingMaskType) >> particleEncodingShiftType) {
							case ParticleType.SOLID:
								particleInitialBase.type = ParticleType.SOLID;
								particlesSolid.set(gridIndex, particleInitialBase);
								break;
							case ParticleType.TANK:
								particleInitialBase.type = ParticleType.TANK;
								particlesTank.set(gridIndex, particleInitialBase);
								break;
							case ParticleType.WEAPON:
								particleInitialBase.type = ParticleType.WEAPON;
								particlesWeapon.set(gridIndex, particleInitialBase);
								break;
						}
					}
				}
			}

			if (WorkerDirtVideoEngine.worldNew === true) {
				WorkerDirtVideoEngine.worldNew = false;
				cacheGridUpdate = true;
				cacheParticlesUpdate = true;

				// Grid
				grid = WorkerDirtVideoEngine.world.grid;
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

				world = WorkerDirtVideoEngine.world;
			}

			if (WorkerDirtVideoEngine.settingsNew === true) {
				WorkerDirtVideoEngine.settingsNew = false;
				cacheGridUpdate = true;
				cacheParticlesUpdate = true;

				settingsDebug = WorkerDirtVideoEngine.settings.debug;
				settingsEdgesWrap = WorkerDirtVideoEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerDirtVideoEngine.settings.fps) * 1000) / 1000;
				settingsGammaCorrection = WorkerDirtVideoEngine.settings.gammaCorrection;
				settingsGrayscale = WorkerDirtVideoEngine.settings.grayscale;
				settingsRenderStyle = WorkerDirtVideoEngine.settings.renderStyle;
			}

			if (WorkerDirtVideoEngine.reportNew === true) {
				WorkerDirtVideoEngine.reportNew = false;
				cacheGridUpdate = true;
				cacheParticlesUpdate = true;

				report = WorkerDirtVideoEngine.report;
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

			if (WorkerDirtVideoEngine.viewNew === true) {
				WorkerDirtVideoEngine.viewNew = false;
				cacheGridUpdate = true;
				cacheParticlesUpdate = true;

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
			if (cacheGridUpdate === true) {
				cacheGridUpdate = false;

				//gridViewportCellSizePxEff = gridViewportCellSizePx + 1;
				gridViewportCellSizePxEff = 1;
				yMax = Math.min(gridYLimit + 1, gridViewportHeightStopEff);

				// Draw: Dirt Inactive
				cacheGridContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);
				for (x = gridViewportWidthStartEff; x < gridViewportWidthStopEff; x++) {
					gridIndex = x * gridSideLength;
					for (y = gridViewportHeightStartEff; y <= yMax; gridIndex++, y++) {
						if (gridData[gridIndex] !== 0) {
							yType = gridData[gridIndex] & worldEncodingMaskType;

							switch (yType) {
								case SolidType.DIRT:
									cacheGridContext.fillStyle = '#905015';
									break;
								case SolidType.LAVA:
									cacheGridContext.fillStyle = '#ff0000';
									break;
								case SolidType.ROCK:
									cacheGridContext.fillStyle = '#505050';
									break;
								case SolidType.WATER:
									cacheGridContext.fillStyle = '#0000ff';
									break;
							}

							cacheGridContext.fillRect(
								(x - gridViewportWidthStart) * gridViewportCellSizePx,
								(y - gridViewportHeightStart) * gridViewportCellSizePx,
								gridViewportCellSizePxEff,
								gridViewportCellSizePxEff,
							);
						}
					}
				}

				// for (x = gridViewportWidthStartEff; x < gridViewportWidthStopEff; x++) {
				// 	gridIndex = x * gridSideLength;
				// 	y1 = -10;
				// 	y2 = -10;
				// 	yType = -10;

				// 	for (y = gridViewportHeightStartEff; y <= yMax; gridIndex++, y++) {
				// 		// Draw segments of dirt instead of individual pixels

				// 		if (gridData[gridIndex] !== 0 && y !== yMax) {
				// 			// Draw previous segment type
				// 			if (yType !== (gridData[gridIndex] & worldEncodingMaskType)) {
				// 				if (y2 === -10) {
				// 					cacheGridContext.fillRect(
				// 						(x - gridViewportWidthStart) * gridViewportCellSizePx,
				// 						(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
				// 						gridViewportCellSizePxEff,
				// 						gridViewportCellSizePxEff,
				// 					);
				// 				} else {
				// 					cacheGridContext.fillRect(
				// 						(x - gridViewportWidthStart) * gridViewportCellSizePx,
				// 						(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
				// 						gridViewportCellSizePxEff,
				// 						gridViewportCellSizePx * (y2 - y1) + 1,
				// 					);
				// 				}

				// 				y1 = -10;
				// 				y2 = -10;
				// 				yType = -10;
				// 			}

				// 			// Start new segment type
				// 			if (y1 === -10) {
				// 				y1 = y;
				// 				yType = gridData[gridIndex] & worldEncodingMaskType;

				// 				switch (yType) {
				// 					case SolidType.DIRT:
				// 						cacheGridContext.fillStyle = '#905015';
				// 						break;
				// 					case SolidType.LAVA:
				// 						cacheGridContext.fillStyle = '#ff0000';
				// 						break;
				// 					case SolidType.ROCK:
				// 						cacheGridContext.fillStyle = '#505050';
				// 						break;
				// 					case SolidType.WATER:
				// 						cacheGridContext.fillStyle = '#0000ff';
				// 						break;
				// 				}
				// 			} else {
				// 				y2 = y;
				// 			}
				// 		} else if (y1 !== -10) {
				// 			// Draw current segment type
				// 			if (y2 === -10) {
				// 				cacheGridContext.fillRect(
				// 					(x - gridViewportWidthStart) * gridViewportCellSizePx,
				// 					(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
				// 					gridViewportCellSizePxEff,
				// 					gridViewportCellSizePxEff,
				// 				);
				// 			} else {
				// 				cacheGridContext.fillRect(
				// 					(x - gridViewportWidthStart) * gridViewportCellSizePx,
				// 					(y1 - gridViewportHeightStart) * gridViewportCellSizePx,
				// 					gridViewportCellSizePxEff,
				// 					gridViewportCellSizePx * (y2 - y1) + 1,
				// 				);
				// 			}

				// 			y1 = -10;
				// 			y2 = -10;
				// 			yType = -10;
				// 		}
				// 	}
				// }
			}

			if (cacheParticlesUpdate === true) {
				cacheParticlesUpdate = false;

				//gridViewportCellSizePxEff = gridViewportCellSizePx + 1;
				gridViewportCellSizePxEff = 1;

				// Clear
				cacheParticlesContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);

				// Draw: Solids
				for (gridIndex of particlesSolid.keys()) {
					y = gridIndex % gridSideLength;
					x = (gridIndex - y) / gridSideLength;

					if (x >= gridViewportWidthStartEff && x <= gridViewportWidthStopEff && y >= gridViewportHeightStartEff && y <= yMax) {
						particleInitialBase = <ParticleInitialBase>particlesSolid.get(gridIndex);

						switch (particleInitialBase.typeValue) {
							case SolidType.DIRT:
								cacheParticlesContext.fillStyle = '#905015';
								break;
							case SolidType.LAVA:
								cacheParticlesContext.fillStyle = '#ff0000';
								break;
							case SolidType.ROCK:
								cacheParticlesContext.fillStyle = '#505050';
								break;
							case SolidType.WATER:
								cacheParticlesContext.fillStyle = '#0000ff';
								break;
						}
					}

					cacheParticlesContext.fillRect(
						(x - gridViewportWidthStart) * gridViewportCellSizePx,
						(y - gridViewportHeightStart) * gridViewportCellSizePx,
						gridViewportCellSizePxEff,
						gridViewportCellSizePxEff,
					);
				}

				// // Draw: Tanks
				// for(gridIndex of particlesTank.keys()) {
				// 	y = gridIndex % gridSideLength;
				// 	x = (gridIndex - y) / gridSideLength;

				// 	if(x >= gridViewportWidthStartEff && x <= gridViewportWidthStopEff && y >= gridViewportHeightStartEff && y <= yMax) {
				// 		particleInitialBase = <ParticleInitialBase>particlesTank.get(gridIndex);
				// 	}
				// }

				// Draw: Weapons
				cacheParticlesContext.fillStyle = '#ffffff';
				for (gridIndex of particlesWeapon.keys()) {
					y = gridIndex % gridSideLength;
					x = (gridIndex - y) / gridSideLength;

					if (x >= gridViewportWidthStartEff && x <= gridViewportWidthStopEff && y >= gridViewportHeightStartEff && y <= yMax) {
						particleInitialBase = <ParticleInitialBase>particlesWeapon.get(gridIndex);
						cacheParticlesContext.fillRect(
							(x - gridViewportWidthStart) * gridViewportCellSizePx,
							(y - gridViewportHeightStart) * gridViewportCellSizePx,
							gridViewportCellSizePxEff,
							gridViewportCellSizePxEff,
						);
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
