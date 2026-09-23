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
	WorkerEffectsVideoBusInputCmd,
	WorkerEffectsVideoBusInputDataCalc,
	WorkerEffectsVideoBusInputDataCalcHeightMaps,
	WorkerEffectsVideoBusInputDataInit,
	WorkerEffectsVideoBusInputDataSettings,
	WorkerEffectsVideoBusInputDataView,
	WorkerEffectsVideoBusInputPayload,
	WorkerEffectsVideoBusOutputCmd,
	WorkerEffectsVideoBusOutputPayload,
	WorkerEffectsVideoBusStats,
} from './effects-video.model.js';

/**
 * @author tknight-dev
 */

/*
 * Input: from Main Thread
 */
self.onmessage = (event: MessageEvent) => {
	const payload: WorkerEffectsVideoBusInputPayload = event.data;

	switch (payload.cmd) {
		case WorkerEffectsVideoBusInputCmd.CALC:
			WorkerEffectsVideoEngine.inputCalc(<WorkerEffectsVideoBusInputDataCalc>payload.data);
			break;
		case WorkerEffectsVideoBusInputCmd.CALC_HEIGHT_MAPS:
			WorkerEffectsVideoEngine.inputCalcHeightMaps(<WorkerEffectsVideoBusInputDataCalcHeightMaps>payload.data);
			break;
		case WorkerEffectsVideoBusInputCmd.INIT:
			WorkerEffectsVideoEngine.initialize(<WorkerEffectsVideoBusInputDataInit>payload.data);
			break;
		case WorkerEffectsVideoBusInputCmd.REPORT:
			WorkerEffectsVideoEngine.inputReport(<GamingCanvasReport>payload.data);
			break;
		case WorkerEffectsVideoBusInputCmd.SETTINGS:
			WorkerEffectsVideoEngine.inputSettings(<WorkerEffectsVideoBusInputDataSettings>payload.data);
			break;
		case WorkerEffectsVideoBusInputCmd.VIEW:
			WorkerEffectsVideoEngine.inputView(<WorkerEffectsVideoBusInputDataView>payload.data);
			break;
		case WorkerEffectsVideoBusInputCmd.WORLD:
			WorkerEffectsVideoEngine.inputWorld(<World>payload.data);
			break;
	}
};

class WorkerEffectsVideoEngine {
	private static animationFrameRequest: number;
	private static calc: WorkerEffectsVideoBusInputDataCalc;
	private static calcHeightMapGrid: Uint32Array | undefined;
	private static calcHeightMapParticles: Uint32Array | undefined;
	private static calcHeightMapsNew: boolean;
	private static calcNew: boolean;
	private static calcParticles: Uint32Array;
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
	private static settings: WorkerEffectsVideoBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};
	private static view: WorkerEffectsVideoBusInputDataView;
	private static viewNew: boolean;

	public static async initialize(data: WorkerEffectsVideoBusInputDataInit): Promise<void> {
		// Config: Canvas
		WorkerEffectsVideoEngine.offscreenCanvas = data.offscreenCanvas;
		WorkerEffectsVideoEngine.offscreenCanvasContext = data.offscreenCanvas.getContext(
			'2d',
			WorkerEffectsVideoEngine.offscreenCanvasContextOptions,
		) as OffscreenCanvasRenderingContext2D;

		// Config
		WorkerEffectsVideoEngine.inputReport(data.report);
		WorkerEffectsVideoEngine.inputWorld(data.world);
		WorkerEffectsVideoEngine.inputSettings(data as WorkerEffectsVideoBusInputDataSettings);
		WorkerEffectsVideoEngine.inputView(data as WorkerEffectsVideoBusInputDataView);

		// Stats
		WorkerEffectsVideoEngine.stats[WorkerEffectsVideoBusStats.ALL] = new GamingCanvasStat(50);

		// Done
		WorkerEffectsVideoEngine.animationLoop();
		WorkerEffectsVideoEngine.post([
			{
				cmd: WorkerEffectsVideoBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);
	}

	/*
	 * Input
	 */
	public static inputCalc(data: WorkerEffectsVideoBusInputDataCalc): void {
		WorkerEffectsVideoEngine.calc = data;
		WorkerEffectsVideoEngine.calcNew = true;
	}

	public static inputCalcHeightMaps(data: WorkerEffectsVideoBusInputDataCalcHeightMaps): void {
		WorkerEffectsVideoEngine.calcHeightMapGrid = data.heightMapGrid;
		WorkerEffectsVideoEngine.calcHeightMapParticles = data.heightMapParticles;
		WorkerEffectsVideoEngine.calcHeightMapsNew = true;
	}

	public static inputWorld(data: World): void {
		WorkerEffectsVideoEngine.world = data;
		WorkerEffectsVideoEngine.world.grid = GamingCanvasGridUint32Array.from(data.grid.data);
		WorkerEffectsVideoEngine.worldNew = true;
	}

	public static inputReport(data: GamingCanvasReport): void {
		WorkerEffectsVideoEngine.report = data;
		WorkerEffectsVideoEngine.reportNew = true;
	}

	public static inputSettings(data: WorkerEffectsVideoBusInputDataSettings): void {
		WorkerEffectsVideoEngine.settings = data;
		WorkerEffectsVideoEngine.settingsNew = true;
	}

	public static inputView(data: WorkerEffectsVideoBusInputDataView): void {
		WorkerEffectsVideoEngine.view = data;
		WorkerEffectsVideoEngine.viewNew = true;
	}

	/*
	 * Output: to Main Thread
	 */
	private static post(payloads: WorkerEffectsVideoBusOutputPayload[], data?: Transferable[]): void {
		self.postMessage(payloads, (data || []) as any);
	}

	/*
	 * Main Loop
	 */
	private static animationLoop(): void {
		let cacheParticles: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheParticlesContext: OffscreenCanvasRenderingContext2D = cacheParticles.getContext(
				'2d',
				WorkerEffectsVideoEngine.offscreenCanvasContextOptions,
			) as OffscreenCanvasRenderingContext2D,
			cacheParticlesUniversalGradient: CanvasGradient,
			cacheUpdate: boolean,
			frameCount: number = 0,
			grid: GamingCanvasGridUint32Array,
			gridCamera: GamingCanvasGridCamera = new GamingCanvasGridCamera(),
			gridData: Uint32Array,
			gridDataValue: number,
			gridHeightMap: Uint32Array,
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
			heightMap: Map<number, number> = new Map(),
			i: number,
			offscreenCanvas: OffscreenCanvas = WorkerEffectsVideoEngine.offscreenCanvas,
			offscreenCanvasContext: OffscreenCanvasRenderingContext2D = WorkerEffectsVideoEngine.offscreenCanvasContext,
			offscreenCanvasHeightPx: number = -1,
			offscreenCanvasWidthPx: number = -1,
			particleInitialBase: ParticleInitialBase,
			particlesEncoded: Uint32Array,
			particlesHeightMap: Uint32Array,
			particlesSolid: Map<number, ParticleInitialBase> = new Map(),
			particlesTank: Map<number, ParticleInitialBase> = new Map(),
			particlesWeapon: Map<number, ParticleInitialBase> = new Map(),
			randomNumberLength: number = 100,
			randomNumbers: number[] = [...Array(randomNumberLength)].map((e) => Math.random()),
			randomNumbersIndex: number = 0,
			report: GamingCanvasReport = WorkerEffectsVideoEngine.report,
			settingsDebug: boolean,
			settingsFPMS: number = 16.666,
			settingsGammaCorrection: number,
			settingsGrayscale: boolean,
			settingsRenderStyle: GamingCanvasRenderStyle,
			shaderDepthHighlight: number = 3,
			statAll: GamingCanvasStat = WorkerEffectsVideoEngine.stats[WorkerEffectsVideoBusStats.ALL],
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
			WorkerEffectsVideoEngine.animationFrameRequest = requestAnimationFrame(go);

			// Timing
			timestampDelta = timestampNow - timestampThen;

			// Config
			if (WorkerEffectsVideoEngine.calcNew === true) {
				WorkerEffectsVideoEngine.calcNew = false;
				cacheUpdate = true;

				if(WorkerEffectsVideoEngine.calc.splashes !== undefined) {
					console.log("SPLASH");
				}
			}

			if (WorkerEffectsVideoEngine.calcHeightMapsNew === true) {
				WorkerEffectsVideoEngine.calcHeightMapsNew = false;
				cacheUpdate = true;

				if (WorkerEffectsVideoEngine.calcHeightMapGrid !== undefined) {
					gridHeightMap = WorkerEffectsVideoEngine.calcHeightMapGrid;
				}

				if (WorkerEffectsVideoEngine.calcHeightMapParticles !== undefined) {
					particlesHeightMap = WorkerEffectsVideoEngine.calcHeightMapParticles;
				}
			}

			if (WorkerEffectsVideoEngine.worldNew === true) {
				WorkerEffectsVideoEngine.worldNew = false;
				cacheUpdate = true;

				// Grid
				gridHeightMap = new Uint32Array(WorkerEffectsVideoEngine.world.grid.sideLength).fill(WorkerEffectsVideoEngine.world.grid.sideLength);
				gridSideLength = WorkerEffectsVideoEngine.world.grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;

				particlesHeightMap = new Uint32Array(WorkerEffectsVideoEngine.world.grid.sideLength).fill(WorkerEffectsVideoEngine.world.grid.sideLength);

				world = WorkerEffectsVideoEngine.world;
			}

			if (WorkerEffectsVideoEngine.settingsNew === true) {
				WorkerEffectsVideoEngine.settingsNew = false;
				cacheUpdate = true;

				settingsDebug = WorkerEffectsVideoEngine.settings.debug;
				settingsFPMS = Math.round((1000 / WorkerEffectsVideoEngine.settings.fps) * 1000) / 1000;
				settingsGammaCorrection = WorkerEffectsVideoEngine.settings.gammaCorrection;
				settingsGrayscale = WorkerEffectsVideoEngine.settings.grayscale;
				settingsRenderStyle = WorkerEffectsVideoEngine.settings.renderStyle;
			}

			if (WorkerEffectsVideoEngine.reportNew === true) {
				WorkerEffectsVideoEngine.reportNew = false;
				cacheUpdate = true;

				report = WorkerEffectsVideoEngine.report;
				if (offscreenCanvasHeightPx !== report.canvasHeight || offscreenCanvasWidthPx !== report.canvasWidth) {
					offscreenCanvasHeightPx = report.canvasHeight;
					offscreenCanvasWidthPx = report.canvasWidth;

					// Canvas
					cacheParticles.height = offscreenCanvasHeightPx;
					cacheParticles.width = offscreenCanvasWidthPx;
					offscreenCanvas.height = offscreenCanvasHeightPx;
					offscreenCanvas.width = offscreenCanvasWidthPx;

					GamingCanvas.renderStyle([cacheParticlesContext, offscreenCanvasContext], settingsRenderStyle);

					// Gradient
					cacheParticlesUniversalGradient = cacheParticlesContext.createLinearGradient(0, 0, 0, offscreenCanvasHeightPx);
					cacheParticlesUniversalGradient.addColorStop(0, 'transparent');
					cacheParticlesUniversalGradient.addColorStop(0.25, 'transparent');
					cacheParticlesUniversalGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
				}
			}

			if (WorkerEffectsVideoEngine.viewNew === true) {
				WorkerEffectsVideoEngine.viewNew = false;
				cacheUpdate = true;

				// Camera
				gridCamera.decode(WorkerEffectsVideoEngine.view.gridCameraEncoded);

				// Viewport
				gridViewport.decode(WorkerEffectsVideoEngine.view.gridViewportEncoded);
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

				// Reset height map
				for (x = 0; x < gridSideLength; x++) {
					heightMap.set(x, gridSideLength);
				}

				cacheParticlesContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);
				yMax = Math.min(gridYLimit + 1, gridViewportHeightStopEff);

				// Draw: Base Pass
				cacheParticlesContext.globalAlpha = 1;
				for (gridIndex of particlesSolid.keys()) {
					y = gridIndex % gridSideLength;
					x = (gridIndex - y) / gridSideLength;

					if (x >= gridViewportWidthStartEff && x <= gridViewportWidthStopEff && y >= gridViewportHeightStartEff && y <= yMax) {
						particleInitialBase = <ParticleInitialBase>particlesSolid.get(gridIndex);

						// Find the highest particle
						if (y < <number>heightMap.get(x)) {
							heightMap.set(x, y);
						}

						switch (particleInitialBase.typeValue) {
							case SolidType.DIRT:
								cacheParticlesContext.fillStyle = '#905015';
								break;
							case SolidType.LAVA:
								if ((x % 2) + (y % 2) === (timestampNow % 400 > 200 ? 1 : 0)) {
									cacheParticlesContext.fillStyle = '#ee0000';
								} else {
									cacheParticlesContext.fillStyle = '#e70000';
								}
								break;
							case SolidType.ROCK:
								if (timestampNow % 200 > 100 === true) {
									cacheParticlesContext.fillStyle = '#a01000';
								} else {
									cacheParticlesContext.fillStyle = '#901000';
								}
								break;
							case SolidType.WATER:
								if ((x % 2) + (y % 2) === (timestampNow % 400 > 200 ? 1 : 0)) {
									cacheParticlesContext.fillStyle = '#0000ee';
								} else {
									cacheParticlesContext.fillStyle = '#0000e7';
								}
								break;
						}

						cacheParticlesContext.fillRect(
							(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
							(y - gridViewportHeightStartEff) * gridViewportCellSizePx,
							gridViewportCellSizePx,
							gridViewportCellSizePx,
						);
					}
				}

				// Draw: Highlights
				cacheParticlesContext.fillStyle = '#ffffff';
				for ([x, y] of heightMap.entries()) {
					if (x >= gridViewportWidthStartEff && x <= gridViewportWidthStopEff && y >= gridViewportHeightStartEff && y <= yMax) {
						y = particlesHeightMap[x];
						y1 = gridHeightMap[x];

						if (y1 !== gridSideLength && y - y1 > 0) {
							continue;
						}

						// Hightlight
						for (i = 0; i < shaderDepthHighlight; i++) {
							if (particlesSolid.get(x * gridSideLength + y + i) !== undefined) {
								cacheParticlesContext.globalAlpha = 0.15 / (1 + i);
								cacheParticlesContext.fillRect(
									(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
									(y - gridViewportHeightStartEff + i) * gridViewportCellSizePx,
									gridViewportCellSizePx,
									gridViewportCellSizePx,
								);
							} else {
								break;
							}
						}
					}
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
							(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
							(y - gridViewportHeightStartEff) * gridViewportCellSizePx,
							gridViewportCellSizePx,
							gridViewportCellSizePx,
						);
					}
				}

				// Draw: Final pass (universal shading)
				cacheParticlesContext.globalAlpha = 1;
				cacheParticlesContext.globalCompositeOperation = 'source-atop';
				cacheParticlesContext.fillStyle = cacheParticlesUniversalGradient;
				cacheParticlesContext.fillRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);
				cacheParticlesContext.globalCompositeOperation = 'source-over';
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
				offscreenCanvasContext.drawImage(cacheParticles, 0, 0);

				// Done
				statAll.watchStop();
			}

			// Stats
			if (timestampNow - timestampStats > 999) {
				timestampStats = timestampNow;

				statAllRaw = <Float32Array>statAll.encode();

				// Output
				WorkerEffectsVideoEngine.post(
					[
						{
							cmd: WorkerEffectsVideoBusOutputCmd.STATS,
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

		WorkerEffectsVideoEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
