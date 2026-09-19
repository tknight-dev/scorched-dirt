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
	WorkerParticleVideoBusInputCmd,
	WorkerParticleVideoBusInputDataInit,
	WorkerParticleVideoBusInputDataSettings,
	WorkerParticleVideoBusInputDataView,
	WorkerParticleVideoBusInputPayload,
	WorkerParticleVideoBusOutputCmd,
	WorkerParticleVideoBusOutputPayload,
	WorkerParticleVideoBusStats,
} from './particle-video.model.js';

/**
 * @author tknight-dev
 */

/*
 * Input: from Main Thread
 */
self.onmessage = (event: MessageEvent) => {
	const payload: WorkerParticleVideoBusInputPayload = event.data;

	switch (payload.cmd) {
		case WorkerParticleVideoBusInputCmd.CALC:
			WorkerParticleVideoEngine.inputCalc(<Uint32Array>payload.data);
			break;
		case WorkerParticleVideoBusInputCmd.INIT:
			WorkerParticleVideoEngine.initialize(<WorkerParticleVideoBusInputDataInit>payload.data);
			break;
		case WorkerParticleVideoBusInputCmd.REPORT:
			WorkerParticleVideoEngine.inputReport(<GamingCanvasReport>payload.data);
			break;
		case WorkerParticleVideoBusInputCmd.SETTINGS:
			WorkerParticleVideoEngine.inputSettings(<WorkerParticleVideoBusInputDataSettings>payload.data);
			break;
		case WorkerParticleVideoBusInputCmd.VIEW:
			WorkerParticleVideoEngine.inputView(<WorkerParticleVideoBusInputDataView>payload.data);
			break;
		case WorkerParticleVideoBusInputCmd.WORLD:
			WorkerParticleVideoEngine.inputWorld(<World>payload.data);
			break;
	}
};

class WorkerParticleVideoEngine {
	private static animationFrameRequest: number;
	private static calcParticles: Uint32Array;
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
	private static settings: WorkerParticleVideoBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};
	private static view: WorkerParticleVideoBusInputDataView;
	private static viewNew: boolean;

	public static async initialize(data: WorkerParticleVideoBusInputDataInit): Promise<void> {
		// Config: Canvas
		WorkerParticleVideoEngine.offscreenCanvas = data.offscreenCanvas;
		WorkerParticleVideoEngine.offscreenCanvasContext = data.offscreenCanvas.getContext(
			'2d',
			WorkerParticleVideoEngine.offscreenCanvasContextOptions,
		) as OffscreenCanvasRenderingContext2D;

		// Config
		WorkerParticleVideoEngine.inputReport(data.report);
		WorkerParticleVideoEngine.inputWorld(data.world);
		WorkerParticleVideoEngine.inputSettings(data as WorkerParticleVideoBusInputDataSettings);
		WorkerParticleVideoEngine.inputView(data as WorkerParticleVideoBusInputDataView);

		// Stats
		WorkerParticleVideoEngine.stats[WorkerParticleVideoBusStats.ALL] = new GamingCanvasStat(50);

		// Done
		WorkerParticleVideoEngine.animationLoop();
		WorkerParticleVideoEngine.post([
			{
				cmd: WorkerParticleVideoBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);
	}

	/*
	 * Input
	 */
	public static inputCalc(data: Uint32Array): void {
		WorkerParticleVideoEngine.calcParticles = data;
		WorkerParticleVideoEngine.calcNew = true;
	}

	public static inputWorld(data: World): void {
		WorkerParticleVideoEngine.world = data;
		WorkerParticleVideoEngine.world.grid = GamingCanvasGridUint32Array.from(data.grid.data);
		WorkerParticleVideoEngine.worldNew = true;
	}

	public static inputReport(data: GamingCanvasReport): void {
		WorkerParticleVideoEngine.report = data;
		WorkerParticleVideoEngine.reportNew = true;
	}

	public static inputSettings(data: WorkerParticleVideoBusInputDataSettings): void {
		WorkerParticleVideoEngine.settings = data;
		WorkerParticleVideoEngine.settingsNew = true;
	}

	public static inputView(data: WorkerParticleVideoBusInputDataView): void {
		WorkerParticleVideoEngine.view = data;
		WorkerParticleVideoEngine.viewNew = true;
	}

	/*
	 * Output: to Main Thread
	 */
	private static post(payloads: WorkerParticleVideoBusOutputPayload[], data?: Transferable[]): void {
		self.postMessage(payloads, (data || []) as any);
	}

	/*
	 * Main Loop
	 */
	private static animationLoop(): void {
		let cacheGrid: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheGridContext: OffscreenCanvasRenderingContext2D = cacheGrid.getContext(
				'2d',
				WorkerParticleVideoEngine.offscreenCanvasContextOptions,
			) as OffscreenCanvasRenderingContext2D,
			cacheGridUpdate: boolean,
			cacheParticles: OffscreenCanvas = new OffscreenCanvas(1, 1),
			cacheParticlesContext: OffscreenCanvasRenderingContext2D = cacheParticles.getContext(
				'2d',
				WorkerParticleVideoEngine.offscreenCanvasContextOptions,
			) as OffscreenCanvasRenderingContext2D,
			cacheUpdate: boolean,
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
			offscreenCanvas: OffscreenCanvas = WorkerParticleVideoEngine.offscreenCanvas,
			offscreenCanvasContext: OffscreenCanvasRenderingContext2D = WorkerParticleVideoEngine.offscreenCanvasContext,
			offscreenCanvasHeightPx: number = -1,
			offscreenCanvasWidthPx: number = -1,
			particleInitialBase: ParticleInitialBase,
			particlesEncoded: Uint32Array,
			particlesSolid: Map<number, ParticleInitialBase> = new Map(),
			particlesTank: Map<number, ParticleInitialBase> = new Map(),
			particlesWeapon: Map<number, ParticleInitialBase> = new Map(),
			report: GamingCanvasReport = WorkerParticleVideoEngine.report,
			settingsDebug: boolean,
			settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			settingsGammaCorrection: number,
			settingsGrayscale: boolean,
			settingsRenderStyle: GamingCanvasRenderStyle,
			statAll: GamingCanvasStat = WorkerParticleVideoEngine.stats[WorkerParticleVideoBusStats.ALL],
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
			WorkerParticleVideoEngine.animationFrameRequest = requestAnimationFrame(go);

			// Timing
			timestampDelta = timestampNow - timestampThen;

			// Config
			if (WorkerParticleVideoEngine.calcNew === true) {
				WorkerParticleVideoEngine.calcNew = false;
				cacheUpdate = true;
				particlesEncoded = WorkerParticleVideoEngine.calcParticles;
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

			if (WorkerParticleVideoEngine.worldNew === true) {
				WorkerParticleVideoEngine.worldNew = false;
				cacheUpdate = true;

				// Grid
				grid = WorkerParticleVideoEngine.world.grid;
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

				world = WorkerParticleVideoEngine.world;
			}

			if (WorkerParticleVideoEngine.settingsNew === true) {
				WorkerParticleVideoEngine.settingsNew = false;
				cacheUpdate = true;

				settingsDebug = WorkerParticleVideoEngine.settings.debug;
				settingsEdgesWrap = WorkerParticleVideoEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerParticleVideoEngine.settings.fps) * 1000) / 1000;
				settingsGammaCorrection = WorkerParticleVideoEngine.settings.gammaCorrection;
				settingsGrayscale = WorkerParticleVideoEngine.settings.grayscale;
				settingsRenderStyle = WorkerParticleVideoEngine.settings.renderStyle;
			}

			if (WorkerParticleVideoEngine.reportNew === true) {
				WorkerParticleVideoEngine.reportNew = false;
				cacheUpdate = true;

				report = WorkerParticleVideoEngine.report;
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

			if (WorkerParticleVideoEngine.viewNew === true) {
				WorkerParticleVideoEngine.viewNew = false;
				cacheUpdate = true;

				// Camera
				gridCamera.decode(WorkerParticleVideoEngine.view.gridCameraEncoded);

				// Viewport
				gridViewport.decode(WorkerParticleVideoEngine.view.gridViewportEncoded);
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

				yMax = Math.min(gridYLimit + 1, gridViewportHeightStopEff);

				// Draw: Solids
				cacheParticlesContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);
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

						cacheParticlesContext.fillRect(
							(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
							(y - gridViewportHeightStartEff) * gridViewportCellSizePx,
							gridViewportCellSizePx,
							gridViewportCellSizePx,
						);
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
				WorkerParticleVideoEngine.post(
					[
						{
							cmd: WorkerParticleVideoBusOutputCmd.STATS,
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

		WorkerParticleVideoEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
