import { GamingCanvas, GamingCanvasDoubleLinkedList, GamingCanvasDoubleLinkedListNode, GamingCanvasRenderStyle, GamingCanvasReport, GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridUint32Array, GamingCanvasGridViewport } from '../../gaming-canvas/modules/grid/index.js';
import {
	ParticleInitialBase,
} from '../../models/physics.model.js';
import { SolidType, World } from '../../models/world.model.js';
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

interface Effect {
	collisionType: SolidType,
	id: number,
	node: GamingCanvasDoubleLinkedListNode<Effect>,
	randomSeed1: number;
	randomSeed2: number;
	timestamp: number;
	type: EffectType;
	x: number;
	y: number;
}

enum EffectType {
	SPLASH,
}

class WorkerEffectsVideoEngine {
	private static animationFrameRequest: number;
	private static calc: WorkerEffectsVideoBusInputDataCalc;
	private static calcHeightMapGrid: Uint32Array | undefined;
	private static calcHeightMapParticles: Uint32Array | undefined;
	private static calcHeightMapsNew: boolean;
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
		let effect: Effect | undefined,
			effectIdCount: number = 0,
			effectNode: GamingCanvasDoubleLinkedListNode<Effect> | undefined,
			effectNodeNext: GamingCanvasDoubleLinkedListNode<Effect> | undefined,
			effects: GamingCanvasDoubleLinkedList<Effect> = new GamingCanvasDoubleLinkedList<Effect>(),
			effectsPool: GamingCanvasDoubleLinkedList<Effect> = new GamingCanvasDoubleLinkedList<Effect>(),
			effectsPoolSize: number = 200,
			effectTimestampDelta: number,
			frameCount: number = 0,
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
			offscreenCanvasUniversalGradient: CanvasGradient,
			particleInitialBase: ParticleInitialBase,
			particlesHeightMap: Uint32Array,
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

				if(WorkerEffectsVideoEngine.calc.splashes !== undefined) {
					for(i of WorkerEffectsVideoEngine.calc.splashes) {
						// Pull from pool first
						effectNode = effectsPool.popStartNode();
						if(effectNode === undefined) {
							effectNode = {
								data: <Effect>{
									id: effectIdCount++,
								},
							}
							effectNode.data.node = effectNode;
						}
						effect = effectNode.data;

						// Config
						effect.collisionType = i & 0xff;
						effect.randomSeed1 = randomNumbers[randomNumbersIndex++ % randomNumberLength];
						effect.randomSeed2 = randomNumbers[randomNumbersIndex++ % randomNumberLength];
						effect.timestamp = timestampNow;
						effect.type = EffectType.SPLASH;
						effect.x = (i >> 20) & 0xfff;
						effect.y = (i >> 8) & 0xfff;

						// Done
						effects.pushEndNode(effectNode);
					}
				}
			}

			if (WorkerEffectsVideoEngine.calcHeightMapsNew === true) {
				WorkerEffectsVideoEngine.calcHeightMapsNew = false;
				if (WorkerEffectsVideoEngine.calcHeightMapGrid !== undefined) {
					gridHeightMap = WorkerEffectsVideoEngine.calcHeightMapGrid;
				}

				if (WorkerEffectsVideoEngine.calcHeightMapParticles !== undefined) {
					particlesHeightMap = WorkerEffectsVideoEngine.calcHeightMapParticles;
				}
			}

			if (WorkerEffectsVideoEngine.worldNew === true) {
				WorkerEffectsVideoEngine.worldNew = false;

				// Effects
				effectNode = effects.popStartNode();
				while(effectNode !== undefined) {
					// Return effect to pool if room available
					if(effectsPool.length < effectsPoolSize) {
						effectsPool.pushEndNode(effectNode);
					}

					effectNode = effects.popStartNode();
				}

				// Grid
				gridHeightMap = new Uint32Array(WorkerEffectsVideoEngine.world.grid.sideLength).fill(WorkerEffectsVideoEngine.world.grid.sideLength);
				gridSideLength = WorkerEffectsVideoEngine.world.grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;

				particlesHeightMap = new Uint32Array(WorkerEffectsVideoEngine.world.grid.sideLength).fill(WorkerEffectsVideoEngine.world.grid.sideLength);

				world = WorkerEffectsVideoEngine.world;
			}

			if (WorkerEffectsVideoEngine.settingsNew === true) {
				WorkerEffectsVideoEngine.settingsNew = false;
				settingsDebug = WorkerEffectsVideoEngine.settings.debug;
				settingsFPMS = Math.round((1000 / WorkerEffectsVideoEngine.settings.fps) * 1000) / 1000;
				settingsGammaCorrection = WorkerEffectsVideoEngine.settings.gammaCorrection;
				settingsGrayscale = WorkerEffectsVideoEngine.settings.grayscale;
				settingsRenderStyle = WorkerEffectsVideoEngine.settings.renderStyle;
			}

			if (WorkerEffectsVideoEngine.reportNew === true) {
				WorkerEffectsVideoEngine.reportNew = false;
				report = WorkerEffectsVideoEngine.report;
				if (offscreenCanvasHeightPx !== report.canvasHeight || offscreenCanvasWidthPx !== report.canvasWidth) {
					offscreenCanvasHeightPx = report.canvasHeight;
					offscreenCanvasWidthPx = report.canvasWidth;

					// Canvas
					offscreenCanvas.height = offscreenCanvasHeightPx;
					offscreenCanvas.width = offscreenCanvasWidthPx;

					GamingCanvas.renderStyle([offscreenCanvasContext], settingsRenderStyle);

					// Gradient
					offscreenCanvasUniversalGradient = offscreenCanvasContext.createLinearGradient(0, 0, 0, offscreenCanvasHeightPx);
					offscreenCanvasUniversalGradient.addColorStop(0, 'transparent');
					offscreenCanvasUniversalGradient.addColorStop(0.25, 'transparent');
					offscreenCanvasUniversalGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
				}
			}

			if (WorkerEffectsVideoEngine.viewNew === true) {
				WorkerEffectsVideoEngine.viewNew = false;
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

			// Animate
			if (timestampDelta >= settingsFPMS) {
				// More accurately calculate for more stable FPS
				timestampThen = timestampNow - (timestampDelta % settingsFPMS);

				// Start
				statAll.watchStart();
				frameCount++;
				offscreenCanvasContext.clearRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);

				// Effects
				yMax = Math.min(gridYLimit + 1, gridViewportHeightStopEff);
				effectNode = effects.start;
				let count = 0;
				while(effectNode !== undefined) {
					effect = effectNode.data;
					effectNodeNext = effectNode.next;
					effectTimestampDelta = timestampNow - effect.timestamp;

					// Effect
					if(effectTimestampDelta > 1000) {
						effects.remove(effectNode);
					}else {
						x = effect.x;
						y = effect.y;

						if (x >= gridViewportWidthStartEff && x <= gridViewportWidthStopEff && y >= gridViewportHeightStartEff && y <= yMax) {
							offscreenCanvasContext.globalAlpha = 1;

							switch(effect.collisionType) {
								case SolidType.LAVA:
									offscreenCanvasContext.fillStyle = "#ff6020";
									break;
								case SolidType.WATER:
									if(effectTimestampDelta % 500 > 250) {
										if ((x % 2) + (y % 2) > 1) {
											offscreenCanvasContext.fillStyle = "#0040dd";
										}else {
											offscreenCanvasContext.fillStyle = "#1050ee";
										}
									}else {
										if ((x % 2) + (y % 2) > 1) {
											offscreenCanvasContext.fillStyle = "#1050ee";
										}else {
											offscreenCanvasContext.fillStyle = "#0030cc";
										}
									}
									break;
								default:
									console.error('EffectsVideo: unexpected splash type "', effect.collisionType,'"');
									break;
							}

							offscreenCanvasContext.fillRect(
								(x - gridViewportWidthStartEff) * gridViewportCellSizePx,
								(y - gridViewportHeightStartEff) * gridViewportCellSizePx,
								gridViewportCellSizePx,
								gridViewportCellSizePx,
							);

							offscreenCanvasContext.fillStyle = "#ffffff";
							offscreenCanvasContext.globalAlpha = 0.1;
							for(i = -1; i < 2; i++) {
								if(i === 0) {
									offscreenCanvasContext.globalAlpha = 0.15;
								}else {
									offscreenCanvasContext.globalAlpha = 0.1;
								}

								offscreenCanvasContext.fillRect(
									(x - gridViewportWidthStartEff + i) * gridViewportCellSizePx,
									(y - gridViewportHeightStartEff - 1) * gridViewportCellSizePx,
									gridViewportCellSizePx,
									gridViewportCellSizePx * 2,
								);
							}
						}
					}

					// Done
					effectNode = effectNodeNext;
				}

				// Effects: Final highlight
				offscreenCanvasContext.globalAlpha = 1;
				offscreenCanvasContext.globalCompositeOperation = 'source-atop';
				offscreenCanvasContext.fillStyle = offscreenCanvasUniversalGradient;
				offscreenCanvasContext.fillRect(0, 0, offscreenCanvasWidthPx, offscreenCanvasHeightPx);
				offscreenCanvasContext.globalCompositeOperation = 'source-over';

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
