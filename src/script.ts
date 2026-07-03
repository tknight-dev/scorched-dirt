import { Map } from './models/map.model.js';
import { ModuleDOM } from './modules/dom.js';
import { ModuleGame } from './modules/game.js';
import { ModuleMap } from './modules/map.js';
import { ModuleSettings } from './modules/settings.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from './gaming-canvas/modules/grid/index.js';
import { WorkerDirtCalcBus } from './workers/dirt-calc/dirt-calc.bus.js';
import { WorkerDirtCalcBusOutputDataStats } from './workers/dirt-calc/dirt-calc.model.js';
import { WorkerDirtVideoBus } from './workers/dirt-video/dirt-video.bus.js';
import { WorkerDirtVideoBusOutputDataStats } from './workers/dirt-video/dirt-video.model.js';

/**
 * @author tknight-dev
 */

// ESBuild live reloader
new EventSource('/esbuild').addEventListener('change', () => location.reload());

class ScorchedDirt {
	public static readonly localStoragePrefix: string = 'TKNIGHT_DEV__SCORCHED_DIRT__';

	private static async initialize(): Promise<void> {
		// DOM
		ModuleDOM.elMenuSettings.onclick = () => {
			ModuleDOM.spinner(true);

			// DOM
			ModuleDOM.elLogo.classList.remove('open');
			ModuleDOM.elMenuContent.classList.remove('open');
			ModuleDOM.elSettingsSectionGameSelect.click();

			// Game
			// Pause

			// Settings
			ModuleSettings.domUpdate();

			// Done
			ModuleDOM.elSettings.style.display = 'block';
			ModuleDOM.spinner(false);
		};
		ModuleDOM.elSettingsApply.onclick = () => {
			ModuleDOM.spinner(true);

			// Settings
			ModuleSettings.domParse();
			ModuleSettings.save();

			// Done
			ModuleDOM.elSettings.style.display = 'none';
			ModuleDOM.spinner(false);
		};

		// Stats
		WorkerDirtCalcBus.setCallbackStats((data: WorkerDirtCalcBusOutputDataStats) => {
			// console.log('WorkerDirtCalcBus > stats:', data);
		});
		WorkerDirtVideoBus.setCallbackStats((data: WorkerDirtVideoBusOutputDataStats) => {
			// console.log('WorkerDirtVideoBus > stats:', data);
		});
	}

	private static async initializeWorkers(): Promise<void> {
		let gridCamera: GamingCanvasGridCamera = ModuleGame.gridCamera,
			gridViewport: GamingCanvasGridViewport = ModuleGame.gridViewport,
			map: Map = ModuleMap.mapActive,
			then: number = performance.now();

		return new Promise<void>((resolve: any) => {
			WorkerDirtCalcBus.initialize(ModuleSettings.data.workerDirtCalc, map, () => {
				// Done
				console.log('WorkerDirtCalcBus: Loaded in', (performance.now() - then) | 0, 'ms');

				// Load video-editor
				then = performance.now();
				WorkerDirtVideoBus.initialize(ModuleDOM.canvases[0], gridCamera, gridViewport, map, ModuleSettings.data.workerDirtVideo, () => {
					// Done
					console.log('WorkerDirtVideoBus: Loaded in', (performance.now() - then) | 0, 'ms');

					// Resolve initial promise
					resolve();
				});
			});
		});
	}

	public static async main(): Promise<void> {
		// Initialize: Base
		await ModuleDOM.initialize();
		await ModuleSettings.initialize(ScorchedDirt.localStoragePrefix);

		// Initialize: Game
		await ModuleGame.initialize();

		// Initialize: Final hooks
		await ScorchedDirt.initialize();

		// Initialize: Workers
		await ScorchedDirt.initializeWorkers();
	}
}
ScorchedDirt.main();
