import { World } from './models/world.model.js';
import { ModuleDOM } from './modules/dom.js';
import { ModuleGame } from './modules/game.js';
import { ModuleWorld } from './modules/world.js';
import { ModuleSettings } from './modules/settings.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from './gaming-canvas/modules/grid/index.js';
import { WorkerDirtCalcBus } from './workers/dirt-calc/dirt-calc.bus.js';
import { WorkerDirtCalcBusOutputDataStats } from './workers/dirt-calc/dirt-calc.model.js';
import { WorkerDirtVideoBus } from './workers/dirt-video/dirt-video.bus.js';
import { WorkerDirtVideoBusOutputDataStats } from './workers/dirt-video/dirt-video.model.js';
import { GamingCanvas } from './gaming-canvas/main/gaming-canvas.js';
import { GamingCanvasStat, GamingCanvasStatCalcType } from './gaming-canvas/main/stat.js';
import { ModuleInput } from './modules/input.js';
import { ModuleBridge } from './modules/bridge.js';

/**
 * @author tknight-dev
 */

// ESBuild live reloader
new EventSource('/esbuild').addEventListener('change', () => location.reload());

class ScorchedDirt {
	private static statFPS: { [key: string]: number } = {};
	public static readonly localStoragePrefix: string = 'TKNIGHT_DEV__SCORCHED_DIRT__';

	private static displayNumber(value: number, precision: number, prefix: string, postfix: string = 'ms'): string {
		return prefix.padStart(3, '#').replaceAll('#', '&nbsp;') + ' ' + value.toFixed(precision).padStart(8, '#').replaceAll('#', '&nbsp;') + postfix;
	}

	private static displayNumberAll(stat: GamingCanvasStat, precision: number): string {
		const displayNumber = ScorchedDirt.displayNumber;
		return `${displayNumber(<number>GamingCanvasStat.calc(stat, GamingCanvasStatCalcType.MAX), precision, 'max')}<br>
${displayNumber(<number>GamingCanvasStat.calc(stat), precision, 'avg')}<br>
${displayNumber(<number>GamingCanvasStat.calc(stat, GamingCanvasStatCalcType.STD_DEV), precision, 'std')}<br>
${displayNumber(<number>GamingCanvasStat.calc(stat, GamingCanvasStatCalcType.MIN), precision, 'min')}`;
	}

	private static displayStatFPS(value: number = Infinity, hardLimit?: boolean): void {
		const element: HTMLElement = ModuleDOM.elStatFPS,
			fpsTarget: number = ModuleSettings.data.main.fps;

		if (value === Infinity) {
			let fps: number;
			for (fps of Object.values(ScorchedDirt.statFPS)) {
				value = Math.min(value, fps);
			}
		}

		element.innerText = String(value);
		if (hardLimit === true) {
			if (value < ModuleSettings.data.main.fps) {
				element.style.color = 'red';
			} else {
				element.style.color = 'green';
			}
		} else {
			if (value < fpsTarget * 0.8) {
				element.style.color = 'red';
			} else if (value < fpsTarget * 0.9) {
				element.style.color = 'yellow';
			} else {
				element.style.color = 'green';
			}
		}
	}

	private static async initializeCallbacks(): Promise<void> {
		const displayNumber = ScorchedDirt.displayNumber,
			displayNumberAll = ScorchedDirt.displayNumberAll,
			precision: number = 2;

		// Stats
		WorkerDirtCalcBus.setCallbackStats((data: WorkerDirtCalcBusOutputDataStats) => {
			const all: GamingCanvasStat = GamingCanvasStat.decode(data.all);

			ModuleDOM.elPerformanceDirtCalcAll.innerHTML = displayNumberAll(all, precision);
			ModuleDOM.elPerformanceDirtWeaponCount.innerHTML = displayNumber(data.particleCountWeapons, 0, '', '');
		});
		WorkerDirtVideoBus.setCallbackStats((data: WorkerDirtVideoBusOutputDataStats) => {
			const all: GamingCanvasStat = GamingCanvasStat.decode(data.all);

			ModuleDOM.elPerformanceDirtVideoAll.innerHTML = displayNumberAll(all, precision);

			ScorchedDirt.statFPS['dirt-video'] = data.fps;
			ScorchedDirt.displayStatFPS();
		});
	}
	private static async initializeDOM(): Promise<void> {
		ModuleDOM.elButtonEdit.onclick = () => {
			ModuleGame.viewEditor();
		};

		ModuleDOM.elButtonPerformance.onclick = () => {
			ModuleGame.viewPerformance();
		};

		ModuleDOM.elButtonPlay.onclick = () => {
			ModuleGame.viewGame();
		};

		// Fullscreen
		ModuleDOM.elButtonFullscreen.onclick = async () => {
			if (ModuleDOM.elButtonFullscreen.classList.contains('active') === true) {
				ModuleGame.fullscreen = false;
				await GamingCanvas.setFullscreen(false);
				await GamingCanvas.wakeLock(false);
			} else {
				ModuleGame.fullscreen = true;
				await GamingCanvas.setFullscreen(true, ModuleDOM.elGame);
				await GamingCanvas.wakeLock(true);
			}
		};
		GamingCanvas.setCallbackFullscreen((state: boolean) => {
			if (state === true) {
				ModuleDOM.elButtonFullscreen.classList.add('active');
				ModuleDOM.elButtonFullscreen.children[0].classList.remove('fullscreen');

				ModuleDOM.elButtonFullscreen.children[0].classList.add('fullscreen-exit');
			} else {
				ModuleDOM.elButtonFullscreen.classList.remove('active');
				ModuleDOM.elButtonFullscreen.children[0].classList.add('fullscreen');

				ModuleDOM.elButtonFullscreen.children[0].classList.remove('fullscreen-exit');

				// Game menu if not clicked() (EG Escape key)
				if (ModuleGame.fullscreen !== false) {
					ModuleGame.gameMenuStart();
				}
			}

			ModuleGame.fullscreen = state;
		});

		// Mute
		ModuleDOM.elButtonMute.onclick = () => {
			if (ModuleDOM.elButtonMute.classList.contains('active') === true) {
				GamingCanvas.audioMute(true);
				ModuleDOM.elButtonMute.classList.remove('active');
				ModuleDOM.elButtonMute.children[0].classList.remove('volume');

				ModuleDOM.elButtonMute.children[0].classList.add('volume-mute');
			} else {
				GamingCanvas.audioMute(false);
				ModuleDOM.elButtonMute.classList.add('active');
				ModuleDOM.elButtonMute.children[0].classList.add('volume');

				ModuleDOM.elButtonMute.children[0].classList.remove('volume-mute');
			}
		};

		// Settings
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
	}

	private static async initializeWorkers(): Promise<void> {
		let gridCamera: GamingCanvasGridCamera = ModuleGame.gridCamera,
			gridViewport: GamingCanvasGridViewport = ModuleGame.gridViewport,
			then: number = performance.now(),
			world: World = ModuleWorld.worldActive;

		return new Promise<void>((resolve: any) => {
			WorkerDirtCalcBus.initialize(ModuleSettings.data.workerDirtCalc, world, () => {
				// Done
				console.log('WorkerDirtCalcBus: Loaded in', (performance.now() - then) | 0, 'ms');

				// Load video-editor
				then = performance.now();
				WorkerDirtVideoBus.initialize(ModuleDOM.canvases[0], gridCamera, gridViewport, ModuleSettings.data.workerDirtVideo, world, () => {
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
		ModuleGame.viewGame(); // Use this until the intro screen is ready

		// Initialize: Inputs
		await ModuleInput.initialize();

		// Initialize: Final hooks
		await ModuleBridge.initialize();
		await ScorchedDirt.initializeCallbacks();
		await ScorchedDirt.initializeDOM();

		// Initialize: Workers
		await ScorchedDirt.initializeWorkers();
	}
}
ScorchedDirt.main();
