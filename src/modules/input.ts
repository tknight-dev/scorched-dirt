import { GamingCanvasFIFOQueue } from '../gaming-canvas/main/fifo-queue.js';
import { GamingCanvas } from '../gaming-canvas/main/gaming-canvas.js';
import { GamingCanvasInputMouse, GamingCanvasInputMouseAction, GamingCanvasInputTouch, GamingCanvasInputTouchAction } from '../gaming-canvas/main/index.js';
import { GamingCanvasInput, GamingCanvasInputPosition, GamingCanvasInputType } from '../gaming-canvas/main/inputs.js';
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
			inputMouseDown: boolean,
			inputTouchDown: boolean,
			propriatary: any,
			position: GamingCanvasInputPosition,
			positions: GamingCanvasInputPosition[],
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
						GamingCanvas.relativizeInputToCanvas(input);
						inputProcessorTouch(input, timestampNow);
						break;
				}
			}
		};

		const inputProcessorMouse = (input: GamingCanvasInputMouse, timestampNow: number) => {
			propriatary = input.propriatary;
			position = input.propriatary.position;

			if (propriatary.action === GamingCanvasInputMouseAction.LEFT) {
				inputMouseDown = propriatary.down;

				if (inputMouseDown === true) {
					WorkerDirtCalcBus.sendWeapon({
						arctan: Math.PI / 2, // 90deg (up)
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: 0.5,
							tankId: 0,
						},
						posX: position.x,
						posY: position.y,
						type: ParticleType.WEAPON,
						typeValue: WeaponType.STANDARD,
					});
				}
			} else if (propriatary.action === GamingCanvasInputMouseAction.MOVE) {
				if (inputMouseDown === true) {
					WorkerDirtCalcBus.sendWeapon({
						arctan: Math.PI / 2, // 90deg (up)
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: 0.5,
							tankId: 0,
						},
						posX: position.x,
						posY: position.y,
						type: ParticleType.WEAPON,
						typeValue: WeaponType.STANDARD,
					});
				}
			}
		};

		const inputProcessorTouch = (input: GamingCanvasInputTouch, timestampNow: number) => {
			propriatary = input.propriatary;
			positions = input.propriatary.positions;

			if (propriatary.action === GamingCanvasInputTouchAction.ACTIVE) {
				inputTouchDown = propriatary.down;

				if (inputTouchDown === true) {
					WorkerDirtCalcBus.sendWeapon({
						arctan: Math.PI / 2, // 90deg (up)
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: 0.5,
							tankId: 0,
						},
						posX: positions[0].x,
						posY: positions[0].y,
						type: ParticleType.WEAPON,
						typeValue: WeaponType.STANDARD,
					});
				}
			} else if (propriatary.action === GamingCanvasInputTouchAction.MOVE) {
				if (inputTouchDown === true) {
					WorkerDirtCalcBus.sendWeapon({
						arctan: Math.PI / 2, // 90deg (up)
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: 0.5,
							tankId: 0,
						},
						posX: positions[0].x,
						posY: positions[0].y,
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
