import { GamingCanvas } from '../gaming-canvas/main/index.js';
import { GamingCanvasGridCamera, GamingCanvasGridViewport } from '../gaming-canvas/modules/grid/index.js';
import { ModuleSettings } from './settings.js';

/**
 * @author tknight-dev
 */

export class ModuleGame {
	public static gridCamera: GamingCanvasGridCamera;
	public static gridViewport: GamingCanvasGridViewport;

	public static async initialize(): Promise<void> {
		let resolutionWidthPx: number = ModuleSettings.data.main.gamingCanvas.resolutionWidthPx || 640;

		ModuleGame.gridCamera = new GamingCanvasGridCamera();
		ModuleGame.gridCamera.r = 0;
		ModuleGame.gridCamera.x = ((resolutionWidthPx / 2) | 0) + 0.5;
		ModuleGame.gridCamera.y = ((((resolutionWidthPx / 16) * 9) / 2) | 0) + 0.5;
		ModuleGame.gridCamera.z = 1;

		ModuleGame.gridViewport = new GamingCanvasGridViewport(resolutionWidthPx);
		ModuleGame.gridViewport.applyZ(ModuleGame.gridCamera, GamingCanvas.getReport());
		ModuleGame.gridViewport.apply(ModuleGame.gridCamera, false);
	}
}
