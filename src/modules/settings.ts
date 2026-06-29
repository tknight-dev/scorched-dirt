import { GamingCanvas, GamingCanvasAudioType, GamingCanvasOptions, GamingCanvasOrientation, GamingCanvasRenderStyle } from '../gaming-canvas/main/index.js';
import { ModuleDOM } from './dom.js';
import { FPS } from '../models/settings.model.js';

/**
 * @author tknight-dev
 */

export type ResolutionWidthPx = undefined | 320 | 640 | 1280 | 1920 | 2560;

export class ModuleSettings {
	public static data = {
		threadMain: {
			audioVolume: 1,
			audioVolumeEffect: 0.8,
			audioVolumeMusic: 0.8,
			fps: FPS._60,
			fpsDisplay: true,
			gamingCanvas: <GamingCanvasOptions>{
				debug: false,
				dpiSupportEnable: true,
				renderStyle: GamingCanvasRenderStyle.PIXELATED,
				resolutionWidthPx: <ResolutionWidthPx>640,
			},
			gammaCorrection: 0,
			grayscale: false,
		},
		threadDirtCalc: {
			fps: FPS._60,
		},
		threadDirtVideo: {
			debug: false,
			fps: FPS._60,
			gammaCorrection: 0,
			grayscale: false,
		},
	};
	private static localStoragePrefix: string; // Set by initialize()
	private static localStorageSettings: string = 'SETTINGS';

	private static apply(): void {
		GamingCanvas.audioVolumeGlobal(ModuleSettings.data.threadMain.audioVolume, GamingCanvasAudioType.ALL);
		GamingCanvas.audioVolumeGlobal(ModuleSettings.data.threadMain.audioVolumeEffect, GamingCanvasAudioType.EFFECT);
		GamingCanvas.audioVolumeGlobal(ModuleSettings.data.threadMain.audioVolumeMusic, GamingCanvasAudioType.MUSIC);
		GamingCanvas.setOptions(ModuleSettings.data.threadMain.gamingCanvas);
	}

	/**
	 * Update the settings to match the DOM elements
	 */
	public static domParse(): void {
		// Audio
		ModuleSettings.data.threadMain.audioVolume = Number(ModuleDOM.elSettingsValueAudioVolume.value);
		ModuleSettings.data.threadMain.audioVolumeEffect = Number(ModuleDOM.elSettingsValueAudioVolumeEffect.value);
		ModuleSettings.data.threadMain.audioVolumeMusic = Number(ModuleDOM.elSettingsValueAudioVolumeMusic.value);

		// Game
		ModuleSettings.data.threadMain.gamingCanvas.debug = ModuleDOM.elSettingsValueGameDebug.checked;

		// Graphics
		ModuleSettings.data.threadMain.gamingCanvas.renderStyle = ModuleDOM.elSettingsValueGraphicsAntialias.checked
			? GamingCanvasRenderStyle.ANTIALIAS
			: GamingCanvasRenderStyle.PIXELATED;
		ModuleSettings.data.threadMain.gamingCanvas.dpiSupportEnable = ModuleDOM.elSettingsValueGraphicsDPI.checked;
		ModuleSettings.data.threadMain.fps = Number(ModuleDOM.elSettingsValueGraphicsFPS.value);
		ModuleSettings.data.threadMain.fpsDisplay = ModuleDOM.elSettingsValueGraphicsFPSShow.checked;
		ModuleSettings.data.threadMain.gammaCorrection = Number(ModuleDOM.elSettingsValueGraphicsGamma.value);
		ModuleSettings.data.threadMain.grayscale = ModuleDOM.elSettingsValueGraphicsGrayscale.checked;
		if (ModuleDOM.elSettingsValueGraphicsResolution.value === 'null') {
			ModuleSettings.data.threadMain.gamingCanvas.resolutionWidthPx = undefined;
		} else {
			ModuleSettings.data.threadMain.gamingCanvas.resolutionWidthPx = <ResolutionWidthPx>Number(ModuleDOM.elSettingsValueGraphicsResolution.value);
		}

		// Normalize
		ModuleSettings.data.threadDirtCalc.fps = ModuleSettings.data.threadMain.fps;
		ModuleSettings.data.threadDirtVideo.debug = ModuleSettings.data.threadMain.gamingCanvas.debug;
		ModuleSettings.data.threadDirtVideo.fps = ModuleSettings.data.threadMain.fps;
		ModuleSettings.data.threadDirtVideo.gammaCorrection = ModuleSettings.data.threadMain.gammaCorrection;
		ModuleSettings.data.threadDirtVideo.grayscale = ModuleSettings.data.threadMain.grayscale;
	}

	/**
	 * Update the DOM elements to match current settings
	 */
	public static domUpdate(): void {
		// Audio
		ModuleDOM.elSettingsValueAudioVolume.value = String(ModuleSettings.data.threadMain.audioVolume);
		ModuleDOM.elSettingsValueAudioVolumeReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolume.value) * 100).toFixed(0) + '%';
		ModuleDOM.elSettingsValueAudioVolumeEffect.value = String(ModuleSettings.data.threadMain.audioVolumeEffect);
		ModuleDOM.elSettingsValueAudioVolumeEffectReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolumeEffect.value) * 100).toFixed(0) + '%';
		ModuleDOM.elSettingsValueAudioVolumeMusic.value = String(ModuleSettings.data.threadMain.audioVolumeMusic);
		ModuleDOM.elSettingsValueAudioVolumeMusicReadout.value = (Number(ModuleDOM.elSettingsValueAudioVolumeMusic.value) * 100).toFixed(0) + '%';

		// Game
		ModuleDOM.elSettingsValueGameDebug.checked = ModuleSettings.data.threadMain.gamingCanvas.debug === true;

		// Graphics
		ModuleDOM.elSettingsValueGraphicsAntialias.checked = ModuleSettings.data.threadMain.gamingCanvas.renderStyle === GamingCanvasRenderStyle.ANTIALIAS;
		ModuleDOM.elSettingsValueGraphicsDPI.checked = ModuleSettings.data.threadMain.gamingCanvas.dpiSupportEnable === true;
		ModuleDOM.elSettingsValueGraphicsGamma.value = String(ModuleSettings.data.threadMain.gammaCorrection);
		ModuleDOM.elSettingsValueGraphicsGammaReadout.value = ModuleDOM.elSettingsValueGraphicsGamma.value + '%';
		ModuleDOM.elSettingsValueGraphicsGrayscale.checked = ModuleSettings.data.threadMain.grayscale;
		ModuleDOM.elSettingsValueGraphicsFPSShow.checked = ModuleSettings.data.threadMain.fpsDisplay;
		ModuleDOM.elSettingsValueGraphicsFPS.value = String(ModuleSettings.data.threadMain.fps);
		ModuleDOM.elSettingsValueGraphicsResolution.value = String(ModuleSettings.data.threadMain.gamingCanvas.resolutionWidthPx || 'null');
	}

	public static async initialize(localStoragePrefix: string): Promise<void> {
		// Config
		ModuleSettings.localStoragePrefix = localStoragePrefix;

		// DOM
		ModuleSettings.initializeDOM();

		// Load
		ModuleSettings.load();

		// URLs
		ModuleSettings.parseURL();

		// Done
		ModuleDOM.canvases = GamingCanvas.initialize(ModuleDOM.elVideo, {
			aspectRatio: 16 / 9,
			audioEnable: true,
			canvasCount: 1,
			debug: ModuleSettings.data.threadMain.gamingCanvas.debug,
			dpiSupportEnable: ModuleSettings.data.threadMain.gamingCanvas.dpiSupportEnable,
			elementInteractive: ModuleDOM.elVideoInteractive,
			inputGamepadEnable: true,
			inputKeyboardEnable: true,
			inputMouseEnable: true,
			inputTouchEnable: true,
			orientation: GamingCanvasOrientation.LANDSCAPE,
			orientationCanvasRotateEnable: false,
			renderStyle: ModuleSettings.data.threadMain.gamingCanvas.renderStyle,
			resolutionScaleToFit: true,
			resolutionWidthPx: ModuleSettings.data.threadMain.gamingCanvas.resolutionWidthPx,
		});
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
		}
	}

	private static parseURL(): void {
		const params: URLSearchParams = new URLSearchParams(document.location.search);
		for (let [name, value] of params.entries()) {
			switch (name.toLowerCase()) {
				case 'dpi':
					ModuleSettings.data.threadMain.gamingCanvas.dpiSupportEnable = String(value).toLowerCase() === 'true';
					break;
				case 'fps':
					ModuleSettings.data.threadMain.fpsDisplay = String(value).toLowerCase() === 'true';
					break;
				case 'effect':
					ModuleSettings.data.threadMain.audioVolumeEffect = Math.max(0, Math.min(100, Number(value) | 0)) / 100;
					break;
				case 'music':
					ModuleSettings.data.threadMain.audioVolumeMusic = Math.max(0, Math.min(100, Number(value) | 0)) / 100;
					break;
				case 'res':
					if (String(value).toLowerCase() === 'null') {
						ModuleSettings.data.threadMain.gamingCanvas.resolutionWidthPx = undefined;
					} else {
						switch (<ResolutionWidthPx>Number(value)) {
							case 320:
							case 640:
							case 1280:
							case 1920:
							case 2560:
								ModuleSettings.data.threadMain.gamingCanvas.resolutionWidthPx = <ResolutionWidthPx>Number(value);
								break;
						}
					}
					break;
				case 'volume':
					ModuleSettings.data.threadMain.audioVolume = Math.max(0, Math.min(1, Number(value)));
					break;
			}
		}
	}

	public static save(): void {
		localStorage.setItem(ModuleSettings.localStoragePrefix + ModuleSettings.localStorageSettings, JSON.stringify(ModuleSettings.data));
	}
}
