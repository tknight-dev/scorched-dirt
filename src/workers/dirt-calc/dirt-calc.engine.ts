import { GamingCanvasDoubleLinkedList, GamingCanvasDoubleLinkedListNode, GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridUint8ClampedArray } from '../../gaming-canvas/modules/grid/grid.js';
import { Map, mapGridMaskActive } from '../../models/map.model.js';
import { Physics, PhysicsCalculated } from '../../models/physics.model.js';
import { WindStrength } from '../../models/settings.model.js';
import { Shot, ShotType, shotTypeProperties, ShotTypeProperty } from '../../models/weapon.models.js';
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
		case WorkerDirtCalcBusInputCmd.SHOT:
			WorkerDirtCalcEngine.inputShot(<Physics<Shot>>payload.data);
			break;
	}
};

class WorkerDirtCalcEngine {
	private static animationFrameRequest: number;
	private static map: Map;
	private static mapNew: boolean;
	private static settings: WorkerDirtCalcBusInputDataSettings;
	private static settingsNew: boolean;
	private static shots: GamingCanvasDoubleLinkedList<PhysicsCalculated<Shot>> = new GamingCanvasDoubleLinkedList();
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
		WorkerDirtCalcEngine.map.grid = GamingCanvasGridUint8ClampedArray.from(data.map.grid.data);
		WorkerDirtCalcEngine.mapNew = true;
	}

	public static inputSettings(data: WorkerDirtCalcBusInputDataSettings): void {
		WorkerDirtCalcEngine.settings = data;
		WorkerDirtCalcEngine.settingsNew = true;
	}

	public static inputShot(data: Physics<Shot>): void {
		const dataFormated: PhysicsCalculated<Shot> = <any>data;

		// TODO, calculated this from the position of the tank fireing.. down the road

		// dataFormated.arctanOriginal = GamingCanvasConstPI_1_000 - Math.atan((tankY - pointerY) / (tankX - pointerX));
		// if (dataFormated.arctanOriginal > GamingCanvasConstPI_1_000) {
		// 	dataFormated.arctanOriginal -= GamingCanvasConstPI_1_000;
		// }
		// dataFormated.arctanOriginal = Math.max(Math.min(dataFormated.arctanOriginal, GamingCanvasConstPI_0_875), GamingCanvasConstPI_0_125); // limit range of arc.. set higher up than this engine
		dataFormated.posX = dataFormated.posXOriginal;
		dataFormated.posY = dataFormated.posYOriginal;

		WorkerDirtCalcEngine.shots.pushEnd(dataFormated);
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
		let dirtActive: GamingCanvasDoubleLinkedList<PhysicsCalculated<null>> = new GamingCanvasDoubleLinkedList(), // Needs grid to optimize calcs
			calcDistance: number,
			calcExplosiveRadius: number,
			grid: GamingCanvasGridUint8ClampedArray,
			gridClone: GamingCanvasGridUint8ClampedArray,
			gridData: Uint8ClampedArray, // AKA dirt inactive
			gridSideLength: number,
			gridUpdated: boolean,
			map: Map,
			settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			settingsWindRandomize: boolean,
			settingsWindStrength: WindStrength,
			shot: GamingCanvasDoubleLinkedListNode<PhysicsCalculated<Shot>> | undefined,
			shotComplete: boolean,
			shotTypeProperty: ShotTypeProperty,
			shots: GamingCanvasDoubleLinkedList<PhysicsCalculated<Shot>> = WorkerDirtCalcEngine.shots,
			statAll: GamingCanvasStat = WorkerDirtCalcEngine.stats[WorkerDirtCalcBusStats.ALL],
			statAllRaw: Float32Array,
			timestampCpu: number = performance.now(),
			timestampFPSDelta: number,
			timestampFPSThen: number = performance.now(),
			timestampStats: number = performance.now(),
			x: number,
			xIndex: number,
			xPos: number,
			y: number,
			yPos: number;

		const go = (timestampNow: number) => {
			// Always start the request for the next frame first!
			WorkerDirtCalcEngine.animationFrameRequest = requestAnimationFrame(go);

			// Config
			if (WorkerDirtCalcEngine.mapNew === true) {
				WorkerDirtCalcEngine.mapNew = false;

				map = WorkerDirtCalcEngine.map;

				// Grid
				grid = map.grid;
				gridData = grid.data;
				gridSideLength = grid.sideLength;
			}

			if (WorkerDirtCalcEngine.settingsNew === true) {
				WorkerDirtCalcEngine.settingsNew = false;

				settingsEdgesWrap = WorkerDirtCalcEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerDirtCalcEngine.settings.fps) * 1000) / 1000;
				settingsWindRandomize = WorkerDirtCalcEngine.settings.windRandomize;
				settingsWindStrength = WorkerDirtCalcEngine.settings.windStrength;
			}

			// Animate
			if (timestampNow - timestampCpu > 12) {
				timestampCpu = timestampNow;

				// Start
				statAll.watchStart();

				// Calc: Shots
				shot = shots.start;
				while (shot !== undefined) {
					shotComplete = true; // Just explode
					shotTypeProperty = shotTypeProperties[shot.data.payload.type];
					xPos = shot.data.posX;
					yPos = shot.data.posY;

					// Dirt: Activate
					calcExplosiveRadius = shotTypeProperty.explosive_radius;
					for (x = xPos - calcExplosiveRadius; x < xPos + calcExplosiveRadius; x++) {
						xIndex = x * gridSideLength;

						for (y = yPos - calcExplosiveRadius; y < yPos + calcExplosiveRadius; y++) {
							if ((gridData[xIndex + y] & mapGridMaskActive) !== 0) {
								calcDistance = ((x - xPos) ** 2 + (y - yPos) ** 2) ** 0.5;
								if (calcDistance <= calcExplosiveRadius) {
									gridUpdated = true;
									gridData[xIndex + y] &= ~mapGridMaskActive; // Remove active state
								}
							}
						}
					}

					// Done
					if (shotComplete === true) {
						shots.remove(<any>shot);
					}
					shot = shot.next;
				}

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
								shotCount: shots.length,
							},
						},
					],
					[statAllRaw.buffer],
				);
			}

			// Video
			timestampFPSDelta = timestampNow - timestampFPSThen;
			if (gridUpdated === true && timestampFPSDelta >= settingsFPMS) {
				gridUpdated = false;

				// More accurately calculate for more stable FPS
				timestampFPSThen = timestampNow - (timestampFPSDelta % settingsFPMS);

				// Upload grid
				gridClone = grid.clone();
				WorkerDirtCalcEngine.post(
					[
						{
							cmd: WorkerDirtCalcBusOutputCmd.DATA,
							data: {
								grid: gridClone,
							},
						},
					],
					[gridClone.data.buffer],
				);
			}
		};

		WorkerDirtCalcEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
