import { GamingCanvas, GamingCanvasAudioType, GamingCanvasOptions, GamingCanvasOrientation, GamingCanvasRenderStyle } from '../gaming-canvas/main/index.js';
import { ModuleDOM } from './dom.js';
import { FPS, WorldSize, WindStrength } from '../models/settings.model.js';
import { WorkerEffectsVideoBus } from '../workers/effects-video/effects-video.bus.js';
import { WorkerEffectsVideoBusInputDataSettings } from '../workers/effects-video/effects-video.model.js';
import { WorkerGridVideoBus } from '../workers/grid-video/grid-video.bus.js';
import { WorkerGridVideoBusInputDataSettings } from '../workers/grid-video/grid-video.model.js';
import { WorkerMainCalcBus } from '../workers/main-calc/main-calc.bus.js';
import { WorkerMainCalcBusInputDataSettings } from '../workers/main-calc/main-calc.model.js';
import { WorkerParticlesVideoBus } from '../workers/particles-video/particles-video.bus.js';
import { WorkerParticlesVideoBusInputDataSettings } from '../workers/particles-video/particles-video.model.js';

/**
 * @author tknight-dev
 */

export class ModuleSettings {
	public static data: any;
	private static localStoragePrefix: string; // Set by initialize()
	private static localStorageSettings: string = 'SETTINGS';

	static {
		ModuleSettings.applyDefault();
	}

	private static apply(): void {
		GamingCanvas.audioVolumeGlobal(ModuleSettings.data.main.audioVolume, GamingCanvasAudioType.ALL);
		GamingCanvas.audioVolumeGlobal(ModuleSettings.data.main.audioVolumeEffect, GamingCanvasAudioType.EFFECT);
		GamingCanvas.audioVolumeGlobal(ModuleSettings.data.main.audioVolumeMusic, GamingCanvasAudioType.MUSIC);
		GamingCanvas.setOptions(ModuleSettings.data.main.gamingCanvas);
	}

	public static applyDefault(): void {
		let worldSize: WorldSize = 192;

		ModuleSettings.data = {
			main: {
				audioVolume: 1,
				audioVolumeEffect: 0.8,
				audioVolumeMusic: 0.8,
				edgesWrap: true,
				fps: FPS._60,
				fpsDisplay: true,
				gamingCanvas: <GamingCanvasOptions>{
					aspectRatio: 16 / 9,
					audioEnable: true,
					canvasCount: 3,
					debug: false,
					dpiSupportEnable: false,
					elementInteractive: ModuleDOM.elVideoInteractive,
					inputGamepadEnable: true,
					inputKeyboardEnable: true,
					inputMouseEnable: true,
					inputMousePreventContextMenu: true,
					inputTouchEnable: true,
					orientation: GamingCanvasOrientation.LANDSCAPE,
					orientationCanvasRotateEnable: false,
					renderStyle: GamingCanvasRenderStyle.PIXELATED,
					resolutionWidthPx: worldSize,
				},
				gammaCorrection: 0,
				grayscale: false,
				worldSize: worldSize,
				windRandomize: false,
				windStrength: WindStrength.NONE,
			},
			workerEffectsVideo: <WorkerEffectsVideoBusInputDataSettings>{
				debug: false,
				fps: FPS._60,
				gammaCorrection: 0,
				grayscale: false,
				renderStyle: GamingCanvasRenderStyle.PIXELATED,
			},
			workerGridVideo: <WorkerGridVideoBusInputDataSettings>{
				debug: false,
				fps: FPS._60,
				gammaCorrection: 0,
				grayscale: false,
				renderStyle: GamingCanvasRenderStyle.PIXELATED,
			},
			workerMainCalc: <WorkerMainCalcBusInputDataSettings>{
				edgesWrap: true,
				fps: FPS._60,
				particlePoolSize: 2000,
				windRandomize: false,
				windStrength: WindStrength.NONE,
			},
			workerParticlesVideo: <WorkerParticlesVideoBusInputDataSettings>{
				debug: false,
				fps: FPS._60,
				gammaCorrection: 0,
				grayscale: false,
				renderStyle: GamingCanvasRenderStyle.PIXELATED,
			},
		};
	}

	public static delete(): void {
		localStorage.removeItem(ModuleSettings.localStoragePrefix + ModuleSettings.localStorageSettings);
	}

	/**
	 * Update the settings to match the DOM elements
	 */
	public static domParse(): void {
		// Audio
		ModuleSettings.data.main.audioVolume = Number(ModuleDOM.elSettingsValueAudioVolume.value);
		ModuleSettings.data.main.audioVolumeEffect = Number(ModuleDOM.elSettingsValueAudioVolumeEffect.value);
		ModuleSettings.data.main.audioVolumeMusic = Number(ModuleDOM.elSettingsValueAudioVolumeMusic.value);

		// Game
		ModuleSettings.data.main.gamingCanvas.debug = ModuleDOM.elSettingsValueGameDebug.checked;
		ModuleSettings.data.main.edgesWrap = ModuleDOM.elSettingsValueGameEdgesWrap.checked;
		ModuleSettings.data.main.windRandomize = ModuleDOM.elSettingsValueGameWindRandomize.checked;
		ModuleSettings.data.main.windStrength = <WindStrength>Number(ModuleDOM.elSettingsValueGameWindStrength.value);

		// Graphics
		ModuleSettings.data.main.gamingCanvas.renderStyle = ModuleDOM.elSettingsValueGraphicsAntialias.checked
			? GamingCanvasRenderStyle.ANTIALIAS
			: GamingCanvasRenderStyle.PIXELATED;
		ModuleSettings.data.main.gamingCanvas.dpiSupportEnable = ModuleDOM.elSettingsValueGraphicsDPI.checked;
		ModuleSettings.data.main.fps = Number(ModuleDOM.elSettingsValueGraphicsFPS.value);
		ModuleSettings.data.main.fpsDisplay = ModuleDOM.elSettingsValueGraphicsFPSShow.checked;
		ModuleSettings.data.main.gammaCorrection = Number(ModuleDOM.elSettingsValueGraphicsGamma.value);
		ModuleSettings.data.main.grayscale = ModuleDOM.elSettingsValueGraphicsGrayscale.checked;

		// Done
		ModuleSettings.normalize();

		// Save
		ModuleSettings.save();

		// Apply
		ModuleSettings.apply();
		ModuleSettings.workersUpdate();
	}

	/**
	 * Update the DOM elements to match current settings
	 */
	public static domUpdate(): void {
		// Audio
		ModuleDOM.elSettingsValueAudioVolume.value = String(ModuleSettings.data.main.audioVolume);
		ModuleDOM.elSettingsValueAudioVolumeReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolume.value) * 100).toFixed(0) + '%';
		ModuleDOM.elSettingsValueAudioVolumeEffect.value = String(ModuleSettings.data.main.audioVolumeEffect);
		ModuleDOM.elSettingsValueAudioVolumeEffectReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolumeEffect.value) * 100).toFixed(0) + '%';
		ModuleDOM.elSettingsValueAudioVolumeMusic.value = String(ModuleSettings.data.main.audioVolumeMusic);
		ModuleDOM.elSettingsValueAudioVolumeMusicReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolumeMusic.value) * 100).toFixed(0) + '%';

		// Game
		ModuleDOM.elSettingsValueGameDebug.checked = ModuleSettings.data.main.gamingCanvas.debug === true;
		ModuleDOM.elSettingsValueGameEdgesWrap.checked = ModuleSettings.data.main.edgesWrap;
		ModuleDOM.elSettingsValueGameWindRandomize.value = ModuleSettings.data.main.windRandomize;
		ModuleDOM.elSettingsValueGameWindStrength.value = String(ModuleSettings.data.main.windStrength);

		// Graphics
		ModuleDOM.elSettingsValueGraphicsAntialias.checked = ModuleSettings.data.main.gamingCanvas.renderStyle === GamingCanvasRenderStyle.ANTIALIAS;
		ModuleDOM.elSettingsValueGraphicsDPI.checked = ModuleSettings.data.main.gamingCanvas.dpiSupportEnable === true;
		ModuleDOM.elSettingsValueGraphicsGamma.value = String(ModuleSettings.data.main.gammaCorrection);
		ModuleDOM.elSettingsValueGraphicsGammaReadout.value = ModuleDOM.elSettingsValueGraphicsGamma.value + '%';
		ModuleDOM.elSettingsValueGraphicsGrayscale.checked = ModuleSettings.data.main.grayscale;
		ModuleDOM.elSettingsValueGraphicsFPSShow.checked = ModuleSettings.data.main.fpsDisplay;
		ModuleDOM.elSettingsValueGraphicsFPS.value = String(ModuleSettings.data.main.fps);
	}

	public static async initialize(localStoragePrefix: string): Promise<void> {
		// Config
		ModuleSettings.localStoragePrefix = localStoragePrefix;

		// DOM
		ModuleSettings.initializeDOM();

		// Load
		ModuleSettings.applyDefault();
		ModuleSettings.delete(); // TMP
		ModuleSettings.load();

		// URLs
		ModuleSettings.parseURL();

		// Done
		ModuleDOM.canvases = GamingCanvas.initialize(ModuleDOM.elVideo, ModuleSettings.data.main.gamingCanvas);
		ModuleSettings.apply();
	}

	private static initializeDOM(): void {
		ModuleDOM.elSettingsValueAudioVolume.oninput = () => {
			GamingCanvas.audioVolumeGlobal(Number(ModuleDOM.elSettingsValueAudioVolume.value), GamingCanvasAudioType.ALL);
			ModuleDOM.elSettingsValueAudioVolumeReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolume.value) * 100).toFixed(0) + '%';
		};
		ModuleDOM.elSettingsValueAudioVolume.oninput = () => {
			GamingCanvas.audioVolumeGlobal(Number(ModuleDOM.elSettingsValueAudioVolume.value), GamingCanvasAudioType.ALL);
			ModuleDOM.elSettingsValueAudioVolumeReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolume.value) * 100).toFixed(0) + '%';
		};
		ModuleDOM.elSettingsValueAudioVolumeEffect.oninput = () => {
			GamingCanvas.audioVolumeGlobal(Number(ModuleDOM.elSettingsValueAudioVolumeEffect.value), GamingCanvasAudioType.EFFECT);
			ModuleDOM.elSettingsValueAudioVolumeEffectReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolumeEffect.value) * 100).toFixed(0) + '%';
		};
		ModuleDOM.elSettingsValueAudioVolumeMusic.oninput = () => {
			GamingCanvas.audioVolumeGlobal(Number(ModuleDOM.elSettingsValueAudioVolumeMusic.value), GamingCanvasAudioType.MUSIC);
			ModuleDOM.elSettingsValueAudioVolumeMusicReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolumeMusic.value) * 100).toFixed(0) + '%';
		};
	}

	private static load(): void {
		const dataRaw: string | null = localStorage.getItem(ModuleSettings.localStoragePrefix + ModuleSettings.localStorageSettings);

		if (dataRaw !== null) {
			Object.assign(ModuleSettings.data, JSON.parse(dataRaw));
			ModuleSettings.normalize();
		}
	}

	private static normalize(): void {
		ModuleSettings.data.workerGridVideo.debug = <boolean>ModuleSettings.data.main.gamingCanvas.debug;
		ModuleSettings.data.workerGridVideo.edgesWrap = ModuleSettings.data.main.edgesWrap;
		ModuleSettings.data.workerGridVideo.fps = ModuleSettings.data.main.fps;
		ModuleSettings.data.workerGridVideo.gammaCorrection = ModuleSettings.data.main.gammaCorrection;
		ModuleSettings.data.workerGridVideo.grayscale = ModuleSettings.data.main.grayscale;
		ModuleSettings.data.workerGridVideo.renderStyle = <GamingCanvasRenderStyle>ModuleSettings.data.main.gamingCanvas.renderStyle;

		ModuleSettings.data.workerMainCalc.edgesWrap = ModuleSettings.data.main.edgesWrap;
		ModuleSettings.data.workerMainCalc.fps = ModuleSettings.data.main.fps;
		ModuleSettings.data.workerMainCalc.windRandomize = ModuleSettings.data.main.windRandomize;
		ModuleSettings.data.workerMainCalc.windStrength = ModuleSettings.data.main.windStrength;

		ModuleSettings.data.workerParticlesVideo.debug = <boolean>ModuleSettings.data.main.gamingCanvas.debug;
		ModuleSettings.data.workerParticlesVideo.edgesWrap = ModuleSettings.data.main.edgesWrap;
		ModuleSettings.data.workerParticlesVideo.fps = ModuleSettings.data.main.fps;
		ModuleSettings.data.workerParticlesVideo.gammaCorrection = ModuleSettings.data.main.gammaCorrection;
		ModuleSettings.data.workerParticlesVideo.grayscale = ModuleSettings.data.main.grayscale;
		ModuleSettings.data.workerParticlesVideo.renderStyle = <GamingCanvasRenderStyle>ModuleSettings.data.main.gamingCanvas.renderStyle;
	}

	private static parseURL(): void {
		const params: URLSearchParams = new URLSearchParams(document.location.search);
		for (let [name, value] of params.entries()) {
			switch (name.toLowerCase()) {
				case 'dpi':
					ModuleSettings.data.main.gamingCanvas.dpiSupportEnable = String(value).toLowerCase() === 'true';
					break;
				case 'fps':
					ModuleSettings.data.main.fpsDisplay = String(value).toLowerCase() === 'true';
					break;
				case 'effect':
					ModuleSettings.data.main.audioVolumeEffect = Math.max(0, Math.min(100, Number(value) | 0)) / 100;
					break;
				case 'music':
					ModuleSettings.data.main.audioVolumeMusic = Math.max(0, Math.min(100, Number(value) | 0)) / 100;
					break;
				case 'volume':
					ModuleSettings.data.main.audioVolume = Math.max(0, Math.min(1, Number(value)));
					break;
			}
		}
	}

	public static save(): void {
		// localStorage.setItem(ModuleSettings.localStoragePrefix + ModuleSettings.localStorageSettings, JSON.stringify(ModuleSettings.data));
	}

	private static workersUpdate(): void {
		WorkerEffectsVideoBus.sendSettings(ModuleSettings.data.workerEffectsVideo);
		WorkerGridVideoBus.sendSettings(ModuleSettings.data.workerGridVideo);
		WorkerMainCalcBus.sendSettings(ModuleSettings.data.workerMainCalc);
		WorkerParticlesVideoBus.sendSettings(ModuleSettings.data.workerParticlesVideo);
	}
}
