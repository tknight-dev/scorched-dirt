import { GamingCanvas } from '../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../gaming-canvas/modules/grid/index.js';
import { World } from '../models/world.model.js';
import { ModuleDOM } from './dom.js';
import { ModuleWorld } from './world.js';
import { ModuleSettings } from './settings.js';

/**
 * @author tknight-dev
 */

export enum ModuleGameView {
	EDITOR,
	GAME,
	PERFORMANCE,
}

export class ModuleGame {
	public static fullscreen: boolean;
	public static gridCamera: GamingCanvasGridCamera;
	public static gridViewport: GamingCanvasGridViewport;
	public static view: ModuleGameView;

	public static gameMenuStart(pauseAudio?: boolean): void {}

	public static gameMenuStop(): void {}

	public static async initialize(): Promise<void> {
		let resolutionWidthPx: number = ModuleSettings.data.main.gamingCanvas.resolutionWidthPx || 640;

		// Grid: Camera
		ModuleGame.gridCamera = new GamingCanvasGridCamera();
		ModuleGame.gridCamera.r = 0;
		ModuleGame.gridCamera.x = ((resolutionWidthPx / 2) | 0) + 0.5;
		ModuleGame.gridCamera.y = ((((resolutionWidthPx / 16) * 9) / 2) | 0) + 0.5;
		ModuleGame.gridCamera.z = 1;

		// Grid: Viewport
		ModuleGame.gridViewport = new GamingCanvasGridViewport(resolutionWidthPx);
		ModuleGame.gridViewport.applyZ(ModuleGame.gridCamera, GamingCanvas.getReport());
		ModuleGame.gridViewport.apply(ModuleGame.gridCamera, false);

		// World
		ModuleWorld.worldActive = ModuleWorld.generate(ModuleSettings.data.main.worldSize, Math.round(Math.random() * 1000000));
	}

	public static viewGame(): void {
		if (ModuleGame.view === ModuleGameView.GAME) {
			return;
		}
		ModuleGame.view = ModuleGameView.GAME;

		// DOM
		ModuleDOM.elButtonEdit.classList.remove('active');
		ModuleDOM.elButtonPerformance.classList.remove('active');
		ModuleDOM.elButtonPlay.classList.add('active');
		ModuleDOM.elIconsTop.style.display = 'flex';
		ModuleDOM.elIconsTop.classList.remove('intro');

		// Overlay
		ModuleDOM.elPerformance.style.display = 'none';
	}

	public static viewEditor(): void {
		if (ModuleGame.view === ModuleGameView.EDITOR) {
			return;
		}
		ModuleGame.view = ModuleGameView.EDITOR;

		// DOM
		ModuleDOM.elButtonEdit.classList.add('active');
		ModuleDOM.elButtonPerformance.classList.remove('active');
		ModuleDOM.elButtonPlay.classList.remove('active');
		ModuleDOM.elIconsTop.style.display = 'flex';
		ModuleDOM.elIconsTop.classList.remove('intro');

		// Overlay
		ModuleDOM.elPerformance.style.display = 'none';
	}

	public static viewPerformance(): void {
		if (ModuleGame.view === ModuleGameView.PERFORMANCE) {
			return;
		}
		ModuleGame.view = ModuleGameView.PERFORMANCE;

		// DOM
		ModuleDOM.elButtonEdit.classList.remove('active');
		ModuleDOM.elButtonPerformance.classList.add('active');
		ModuleDOM.elButtonPlay.classList.remove('active');
		ModuleDOM.elIconsTop.style.display = 'flex';
		ModuleDOM.elIconsTop.classList.remove('intro');

		// Overlay
		ModuleDOM.elPerformance.style.display = 'flex';
	}
}
