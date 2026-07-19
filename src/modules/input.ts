import { GamingCanvasFIFOQueue } from '../gaming-canvas/main/fifo-queue.js';
import { GamingCanvas } from '../gaming-canvas/main/gaming-canvas.js';
import { GamingCanvasInputMouse, GamingCanvasInputMouseAction } from '../gaming-canvas/main/index.js';
import { GamingCanvasInput, GamingCanvasInputType } from '../gaming-canvas/main/inputs.js';
import { particleEncodingValueHealth, ParticleType } from '../models/physics.model.js';
import { WeaponType } from '../models/weapon.model.js';
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
			inputDown: boolean,
			propriatary: any,
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

		const inputProcessorMouse = (input: GamingCanvasInputMouse, timestampNow: number) => {
			propriatary = input.propriatary;

			if (propriatary.action === GamingCanvasInputMouseAction.LEFT) {
				inputDown = propriatary.down;

				if (inputDown === true) {
					WorkerDirtCalcBus.sendWeapon({
						arctan: Math.PI / 2, // 90deg (up)
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: Math.max(0.1, Math.random()),
							tankId: 0,
						},
						posX: propriatary.position.x,
						posY: propriatary.position.y,
						type: ParticleType.WEAPON,
						typeValue: WeaponType.STANDARD,
					});
				}
			} else if (propriatary.action === GamingCanvasInputMouseAction.MOVE) {
				if (inputDown === true) {
					WorkerDirtCalcBus.sendWeapon({
						arctan: Math.PI / 2, // 90deg (up)
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: Math.max(0.1, Math.random()),
							tankId: 0,
						},
						posX: propriatary.position.x,
						posY: propriatary.position.y,
						type: ParticleType.WEAPON,
						typeValue: WeaponType.STANDARD,
					});
				}
			}
		};

		ModuleInput.inputLoop = go;
		ModuleInput.animationFrameRequest = requestAnimationFrame(go);
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
