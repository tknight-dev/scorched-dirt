import { GamingCanvasFIFOQueue } from '../gaming-canvas/main/fifo-queue.js';
import { GamingCanvas } from '../gaming-canvas/main/gaming-canvas.js';
import { GamingCanvasInputMouse, GamingCanvasInputMouseAction } from '../gaming-canvas/main/index.js';
import { GamingCanvasInput, GamingCanvasInputType } from '../gaming-canvas/main/inputs.js';
import { ShotType } from '../models/weapon.models.js';
import { WorkerDirtCalcBus } from '../workers/dirt-calc/dirt-calc.bus.js';

/**
 * @author tknight-dev
 */

export class ModuleInput {
	private static animationFrameRequest: number;
	private static paused: boolean;

	private static inputLoop(_timestampNow: number): void {}
	private static inputLoop__funcForward(): void {
		let input: GamingCanvasInput,
			inputProcessorMouse = ModuleInput.inputProcessorMouse,
			queue: GamingCanvasFIFOQueue<GamingCanvasInput> = GamingCanvas.getInputQueue();

		const go = (timestampNow: number) => {
			// Start the request for the next frame before processing the data (faster)
			ModuleInput.animationFrameRequest = requestAnimationFrame(go);

			while (queue.length !== 0) {
				input = queue.pop() as GamingCanvasInput;

				switch (input.type) {
					case GamingCanvasInputType.GAMEPAD:
						break;
					case GamingCanvasInputType.KEYBOARD:
						break;
					case GamingCanvasInputType.MOUSE:
						GamingCanvas.relativizeInputToCanvas(input);
						inputProcessorMouse(input, timestampNow);
						break;
					case GamingCanvasInputType.TOUCH:
						break;
				}
			}
		};
		ModuleInput.inputLoop = go;
		ModuleInput.animationFrameRequest = requestAnimationFrame(go);
	}

	private static inputProcessorMouse(input: GamingCanvasInputMouse, timestampNow: number): void {
		const propriatary: any = input.propriatary;

		if (propriatary.action === GamingCanvasInputMouseAction.LEFT && propriatary.down) {
			WorkerDirtCalcBus.sendShot({
				arctan: 0,
				posX: 0,
				posXFinal: 0,
				posXOriginal: propriatary.position.x,
				posY: 0,
				posYFinal: 0,
				posYOriginal: propriatary.position.y,
				power_percentage: 0,
				tankId: 0,
				type: ShotType.STANDARD,
				velX: 0,
				velY: 0,
			});
		}
	}

	public static async initialize(): Promise<void> {
		// Done
		ModuleInput.inputLoop__funcForward();
	}

	public static pause(state: boolean): void {
		if (state === ModuleInput.paused) {
			return;
		}
		ModuleInput.paused = state;

		if (state === true) {
			GamingCanvas.setInputState(true);
			GamingCanvas.clearInputQueue();
			ModuleInput.animationFrameRequest = requestAnimationFrame(ModuleInput.inputLoop);
		} else {
			GamingCanvas.setInputState(false);
			cancelAnimationFrame(ModuleInput.animationFrameRequest);
		}
	}
}
