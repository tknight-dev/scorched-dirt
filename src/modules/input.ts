import { GamingCanvasFIFOQueue } from '../gaming-canvas/main/fifo-queue.js';
import { GamingCanvas } from '../gaming-canvas/main/gaming-canvas.js';
import { GamingCanvasInputMouse, GamingCanvasInputMouseAction, GamingCanvasInputTouch, GamingCanvasInputTouchAction } from '../gaming-canvas/main/index.js';
import { GamingCanvasInput, GamingCanvasInputPosition, GamingCanvasInputType } from '../gaming-canvas/main/inputs.js';
import { particleEncodingValueHealth, ParticleInitial, ParticleType } from '../models/physics.model.js';
import { Weapon, WeaponType } from '../models/weapon.model.js';
import { SolidType } from '../models/world.model.js';
import { WorkerMainCalcBus } from '../workers/main-calc/main-calc.bus.js';
import { ModuleSettings } from './settings.js';

/**
 * @author tknight-dev
 */

export class ModuleInput {
	private static animationFrameRequest: number;
	private static paused: boolean;

	private static inputLoop(_timestampNow: number): void {}
	private static inputLoop__funcForward(): void {
		let input: GamingCanvasInput,
			inputMouseDownLeft: boolean,
			inputMouseDownRight: boolean,
			inputMouseTypeValue: number | undefined,
			inputMouseWheelDown: boolean,
			inputMouseWheelDownArray: ParticleInitial<Weapon>[] = [],
			inputMouseWheelDownSize: number = 1,
			inputTouchDown: boolean,
			propriatary: any,
			position: GamingCanvasInputPosition,
			positions: GamingCanvasInputPosition[],
			queue: GamingCanvasFIFOQueue<GamingCanvasInput> = GamingCanvas.getInputQueue(),
			x: number,
			y: number;

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
				inputMouseDownLeft = propriatary.down;

				if (inputMouseDownLeft === true) {
					WorkerMainCalcBus.sendParticle({
						arctan: (3 * Math.PI) / 4,
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: 0,
							tankId: 0,
						},
						posX: position.x,
						posY: position.y,
						type: ParticleType.SOLID,
						typeValue: SolidType.LAVA,
					});
				}
			} else if (propriatary.action === GamingCanvasInputMouseAction.RIGHT) {
				inputMouseDownRight = propriatary.down;

				if (inputMouseDownRight === true) {
					WorkerMainCalcBus.sendParticle({
						arctan: 0,
						health: particleEncodingValueHealth,
						payload: {
							powerPercentage: 0,
							tankId: 0,
						},
						posX: position.x,
						posY: position.y,
						type: ParticleType.SOLID,
						typeValue: SolidType.WATER,
					});
				}
			} else if (propriatary.action === GamingCanvasInputMouseAction.MOVE) {
				if (inputMouseDownLeft === true) {
					inputMouseTypeValue = SolidType.LAVA;
				} else if (inputMouseDownRight === true) {
					inputMouseTypeValue = SolidType.WATER;
				} else {
					inputMouseTypeValue = undefined;
				}

				if (inputMouseTypeValue !== undefined) {
					if (inputMouseWheelDown !== true) {
						WorkerMainCalcBus.sendParticle({
							arctan: 0,
							health: particleEncodingValueHealth,
							payload: {
								powerPercentage: 0,
								tankId: 0,
							},
							posX: position.x,
							posY: position.y,
							type: ParticleType.SOLID,
							typeValue: inputMouseTypeValue,
						});
					} else {
						inputMouseWheelDownArray.length = 0;
						for (x = -inputMouseWheelDownSize; x < inputMouseWheelDownSize; x++) {
							for (y = -inputMouseWheelDownSize; y < inputMouseWheelDownSize; y++) {
								inputMouseWheelDownArray.push({
									arctan: 0,
									health: particleEncodingValueHealth,
									payload: {
										powerPercentage: 0,
										tankId: 0,
									},
									posX: position.x + x + inputMouseWheelDownSize,
									posY: position.y + y + inputMouseWheelDownSize,
									type: ParticleType.SOLID,
									typeValue: inputMouseTypeValue,
								});
							}
						}
						WorkerMainCalcBus.sendParticle(inputMouseWheelDownArray);
					}
				}
			} else if (propriatary.action === GamingCanvasInputMouseAction.WHEEL) {
				inputMouseWheelDown = propriatary.down;
			}
		};

		const inputProcessorTouch = (input: GamingCanvasInputTouch, timestampNow: number) => {
			propriatary = input.propriatary;
			positions = input.propriatary.positions;

			if (propriatary.action === GamingCanvasInputTouchAction.ACTIVE) {
				inputTouchDown = propriatary.down;

				if (inputTouchDown === true) {
					if (positions.length === 1) {
						WorkerMainCalcBus.sendParticle({
							arctan: (3 * Math.PI) / 4,
							health: particleEncodingValueHealth,
							payload: {
								powerPercentage: 0,
								tankId: 0,
							},
							posX: positions[0].x,
							posY: positions[0].y,
							type: ParticleType.SOLID,
							typeValue: SolidType.LAVA,
						});
					} else {
						WorkerMainCalcBus.sendParticle({
							arctan: 0,
							health: particleEncodingValueHealth,
							payload: {
								powerPercentage: 0,
								tankId: 0,
							},
							posX: positions[0].x,
							posY: positions[0].y,
							type: ParticleType.SOLID,
							typeValue: SolidType.WATER,
						});
					}
				}
			} else if (propriatary.action === GamingCanvasInputTouchAction.MOVE) {
				if (inputTouchDown === true) {
					if (positions.length === 1) {
						WorkerMainCalcBus.sendParticle({
							arctan: (3 * Math.PI) / 4,
							health: particleEncodingValueHealth,
							payload: {
								powerPercentage: 0,
								tankId: 0,
							},
							posX: positions[0].x,
							posY: positions[0].y,
							type: ParticleType.SOLID,
							typeValue: SolidType.LAVA,
						});
					} else {
						WorkerMainCalcBus.sendParticle({
							arctan: 0,
							health: particleEncodingValueHealth,
							payload: {
								powerPercentage: 0,
								tankId: 0,
							},
							posX: positions[0].x,
							posY: positions[0].y,
							type: ParticleType.SOLID,
							typeValue: SolidType.WATER,
						});
					}
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
