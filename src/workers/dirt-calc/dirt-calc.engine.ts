import { GamingCanvasDoubleLinkedList, GamingCanvasDoubleLinkedListNode, GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridUint32Array } from '../../gaming-canvas/modules/grid/grid.js';
import { Solid, World, worldEncodingShiftHealth } from '../../models/world.model.js';
import {
	Particle,
	particleEncodingMaskType,
	particleEncodingShiftHealth,
	particleEncodingShiftType,
	particleEncodingShiftTypeValue,
	particleEncodingShiftX,
	ParticleInitial,
	ParticleType,
} from '../../models/physics.model.js';
import { WindStrength } from '../../models/settings.model.js';
import { Weapon } from '../../models/weapon.model.js';
import {
	WorkerDirtCalcBusInputCmd,
	WorkerDirtCalcBusInputDataInit,
	WorkerDirtCalcBusInputDataWorld,
	WorkerDirtCalcBusInputDataSettings,
	WorkerDirtCalcBusInputPayload,
	WorkerDirtCalcBusOutputCmd,
	WorkerDirtCalcBusOutputPayload,
	WorkerDirtCalcBusStats,
} from './dirt-calc.model.js';
import { Tank, TankType } from '../../models/tank.model.js';

/**
 * @author tknight-dev
 */

/*
 * Input: from Main Thread
 */
self.onmessage = (event: MessageEvent) => {
	const payload: WorkerDirtCalcBusInputPayload = event.data;

	switch (payload.cmd) {
		case WorkerDirtCalcBusInputCmd.INIT:
			WorkerDirtCalcEngine.initialize(<WorkerDirtCalcBusInputDataInit>payload.data);
			break;
		case WorkerDirtCalcBusInputCmd.MAP:
			WorkerDirtCalcEngine.inputWorld(<WorkerDirtCalcBusInputDataWorld>payload.data);
			break;
		case WorkerDirtCalcBusInputCmd.SETTINGS:
			WorkerDirtCalcEngine.inputSettings(<WorkerDirtCalcBusInputDataSettings>payload.data);
			break;
		case WorkerDirtCalcBusInputCmd.WEAPON:
			WorkerDirtCalcEngine.inputWeapon(<ParticleInitial<Weapon>>payload.data);
			break;
	}
};

class WorkerDirtCalcEngine {
	private static animationFrameRequest: number;
	private static settings: WorkerDirtCalcBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};
	private static tanks: Map<number, Tank> = new Map();
	private static weapons: GamingCanvasDoubleLinkedList<Particle<Weapon>> = new GamingCanvasDoubleLinkedList();
	private static world: World;
	private static worldNew: boolean;

	public static async initialize(data: WorkerDirtCalcBusInputDataInit): Promise<void> {
		// Stats
		WorkerDirtCalcEngine.stats[WorkerDirtCalcBusStats.ALL] = new GamingCanvasStat(50);

		// Config: World
		WorkerDirtCalcEngine.inputWorld(data as WorkerDirtCalcBusInputDataWorld);

		// Config: Settings
		WorkerDirtCalcEngine.inputSettings(data as WorkerDirtCalcBusInputDataSettings);

		// Done
		WorkerDirtCalcEngine.animationLoop();
		WorkerDirtCalcEngine.post([
			{
				cmd: WorkerDirtCalcBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);
	}

	/*
	 * Input
	 */
	public static inputSettings(data: WorkerDirtCalcBusInputDataSettings): void {
		WorkerDirtCalcEngine.settings = data;
		WorkerDirtCalcEngine.settingsNew = true;
	}

	public static inputWeapon(data: ParticleInitial<Weapon>): void {
		let particle: Particle<Weapon> = <any>data,
			payload: Weapon = <Weapon>data.payload,
			tank: Tank | undefined = WorkerDirtCalcEngine.tanks.get(payload.tankId);

		// TMP: eventually this will just be a map of actual tanks to use instead
		if (tank === undefined) {
			tank = {
				armor: 10,
				health: 90,
				id: 0,
				inventory: {},
				money: 10,
				name: 'TankyMcTankFace',
				statHorsepower: 10,
				statPower: 10,
			};
			WorkerDirtCalcEngine.tanks.set(tank.id, tank);
		}

		particle.arctanOriginal = particle.arctan;
		particle.posXOriginal = particle.posX;
		particle.posYOriginal = particle.posY;
		particle.velX = payload.powerPercentage * tank.statPower * Math.cos(particle.arctan);
		particle.velY = payload.powerPercentage * tank.statPower * Math.sin(particle.arctan);

		// Fix rounding errors
		if (Math.abs(particle.velX) < 0.00001) {
			particle.velX = 0;
		} else if (Math.abs(particle.velY) < 0.00001) {
			particle.velY = 0;
		}

		WorkerDirtCalcEngine.weapons.pushEnd(particle);
	}

	public static inputWorld(data: WorkerDirtCalcBusInputDataWorld): void {
		WorkerDirtCalcEngine.world = data.world;
		WorkerDirtCalcEngine.world.grid = GamingCanvasGridUint32Array.from(data.world.grid.data);
		WorkerDirtCalcEngine.worldNew = true;
	}

	/*
	 * Output: to Main Thread
	 */
	private static post(payloads: WorkerDirtCalcBusOutputPayload[], data?: Transferable[]): void {
		self.postMessage(payloads, (data || []) as any);
	}

	/*
	 * Main Loop
	 */
	private static animationLoop(): void {
		let buffers: ArrayBufferLike[] = [],
			collisionX: boolean,
			collisionY: boolean,
			collisionCalcDepth: number = 3,
			collisionRelationshipX: (number | null | undefined)[] = new Array(collisionCalcDepth), // gridIndex, null is empty space, undefined is edge
			collisionRelationshipY: (number | null | undefined)[] = new Array(collisionCalcDepth), // gridIndex, null is empty space, undefined is edge
			collisionRelationshipXY: (number | null | undefined)[] = new Array(collisionCalcDepth), // gridIndex, null is empty space, undefined is edge
			cpuCycleTimeInMs: number = 10,
			grid: GamingCanvasGridUint32Array,
			gridClone: GamingCanvasGridUint32Array | undefined,
			gridData: Uint32Array, // AKA inactive solids
			gridIndex: number,
			gridSideLength: number,
			gridUpdate: boolean,
			gridYLimit: number,
			i: number,
			incrementX: number,
			incrementY: number,
			particle: Particle<any>,
			particleCountSolids: number = 0,
			particleCountWeapons: number = 0,
			particleMap: Map<number, Particle<any>> = new Map(), // <gridPostion, particle>
			particleMotionComplete: boolean,
			particleNode: GamingCanvasDoubleLinkedListNode<Particle<any>> | undefined,
			particles: GamingCanvasDoubleLinkedList<Particle<any>> = new GamingCanvasDoubleLinkedList(),
			particlesEncoded: Uint32Array | undefined,
			posNextIndex: number,
			posX: number,
			posXNext: number,
			posY: number,
			posYNext: number,
			timestampCPU: number = performance.now(),
			timestampCPUDelta: number,
			timestampFPSDelta: number,
			timestampFPSThen: number = performance.now(),
			timestampStats: number = performance.now(),
			settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			settingsWindRandomize: boolean,
			settingsWindStrength: WindStrength,
			statAll: GamingCanvasStat = WorkerDirtCalcEngine.stats[WorkerDirtCalcBusStats.ALL],
			statAllRaw: Float32Array,
			velMaxUnsigned: number,
			velX: number,
			velY: number,
			world: World,
			x: number,
			xNext: number,
			y: number,
			yNext: number;

		// dirtActive: GamingCanvasDoubleLinkedList<ParticleCalculated<null>> = new GamingCanvasDoubleLinkedList(), // Needs grid to optimize calcs
		// 	calcAnnihilationRadius: number,
		// 	calcArcTan: number,
		// 	calcDistance: number,
		// 	calcDamageExplosive: number,
		// 	calcExplosiveRadius: number,
		// 	mathCOS = Math.cos,
		// 	mathSIN = Math.sin,
		// 	particles: Map<number, ParticleCalculated<any>> = new Map(),
		// 	shot: GamingCanvasDoubleLinkedListNode<ParticleCalculated<Weapon>> | undefined,
		// 	shotData: ParticleCalculated<Weapon>,
		// 	shotComplete: boolean,
		// 	shotTypeProperty: WeaponTypeProperty,
		// 	shots: GamingCanvasDoubleLinkedList<ParticleCalculated<Weapon>> = WorkerDirtCalcEngine.shots,

		const go = (timestampNow: number) => {
			// Always start the request for the next frame first!
			WorkerDirtCalcEngine.animationFrameRequest = requestAnimationFrame(go);

			// Config
			if (WorkerDirtCalcEngine.settingsNew === true) {
				WorkerDirtCalcEngine.settingsNew = false;

				settingsEdgesWrap = WorkerDirtCalcEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerDirtCalcEngine.settings.fps) * 1000) / 1000;
				settingsWindRandomize = WorkerDirtCalcEngine.settings.windRandomize;
				settingsWindStrength = WorkerDirtCalcEngine.settings.windStrength;

				// Cycle the physics system 25% faster than the desired FPS rate
				cpuCycleTimeInMs = (settingsFPMS * 0.75) | 0;
			}

			if (WorkerDirtCalcEngine.worldNew === true) {
				WorkerDirtCalcEngine.worldNew = false;

				world = WorkerDirtCalcEngine.world;

				// Grid
				grid = world.grid;
				gridData = grid.data;
				gridSideLength = grid.sideLength;
				gridYLimit = (gridSideLength * 9) / 16;
			}

			if (WorkerDirtCalcEngine.weapons.length !== 0) {
				particleNode = WorkerDirtCalcEngine.weapons.start;
				while (particleNode !== undefined) {
					particleMap.set((particleNode.data.posX | 0) * gridSideLength + (particleNode.data.posY | 0), particleNode.data);
					particles.pushEndNode(particleNode);

					if (particleNode.data.type === ParticleType.WEAPON) {
						particleCountWeapons++;
					}

					// Done
					particleNode = particleNode.next;
				}
				WorkerDirtCalcEngine.weapons.clear();
			}

			// Animate
			if (particleMap.size === 0) {
				timestampCPU = timestampNow;
			}
			timestampCPUDelta = timestampNow - timestampCPU;
			if (timestampCPUDelta >= cpuCycleTimeInMs) {
				timestampCPU = timestampNow;

				// Start
				statAll.watchStart();

				// Calc
				particleNode = particles.start;
				while (particleNode !== undefined) {
					// Calc: velMaxUnsigned
					velMaxUnsigned = 0;
					particleNode = particles.start;
					while (particleNode !== undefined) {
						particle = particleNode.data;

						x = Math.abs(particle.velX);
						if (x > velMaxUnsigned) {
							velMaxUnsigned = x;
						}

						y = Math.abs(particle.velY);
						if (y > velMaxUnsigned) {
							velMaxUnsigned = y;
						}

						// Done
						particleNode = particleNode.next;
					}

					/**
					 * Calc: Velocity Scale and Step
					 *
					 * All velocities are scaled such that the fastest velocity is equal to 1. Each cycle then moves particles a maximum of one pixel at a time
					 *
					 * Bug: velY = 10, velYScale = 1, velYStep = 1: one cycle means the particle only moved one. The cycle has to be repeated until the fast particles distance
					 * traveled is equal to the initial velocity. That way a particle with velocity 10 moves 10 pixels per group of cycles even tho each cycle is 1pixel
					 */
					particleNode = particles.start;
					while (particleNode !== undefined) {
						particle = particleNode.data;

						// X
						if (particle.velX === 0) {
							particle.velXScaled = 0;
							particle.velXStep = 0;
						} else {
							if (velMaxUnsigned === 0) {
								particle.velXScaledAbs = 0;
							} else {
								particle.velXScaledAbs = (particle.velX * (particle.velX / velMaxUnsigned)) / velMaxUnsigned;
							}
							particle.velXStep = 1;

							// Velocity sign correction
							if (particle.velX < 0) {
								particle.velXScaled = particle.velXScaledAbs * -1;
							} else {
								particle.velXScaled = particle.velXScaledAbs;
							}
						}

						// Y
						if (particle.velY === 0) {
							particle.velYScaled = 0;
							particle.velYStep = 0;
						} else {
							if (velMaxUnsigned === 0) {
								particle.velYScaledAbs = 0;
							} else {
								particle.velYScaledAbs = (particle.velY * (particle.velY / velMaxUnsigned)) / velMaxUnsigned;
							}
							particle.velYStep = 1;

							// Velocity sign correction
							if (particle.velY < 0) {
								particle.velYScaled = particle.velYScaledAbs * -1;
							} else {
								particle.velYScaled = particle.velYScaledAbs;
							}
						}

						// Done
						particleNode = particleNode.next;
					}

					// Calc: Physics
					particleNode = particles.start;
					while (particleNode !== undefined) {
						collisionX = false;
						collisionY = false;
						particle = particleNode.data;

						// Position: Current
						posX = particle.posX | 0;
						posY = particle.posY | 0;

						if (velMaxUnsigned !== 0) {
							// Calc: Motion - X
							if (particle.velXStep > 0) {
								particle.posX += particle.velXScaled * timestampCPUDelta * 0.25;
								particle.velXStep -= particle.velXScaledAbs;
							}

							// Calc: Motion - Y
							if (particle.velYStep > 0) {
								particle.posY -= particle.velYScaled * timestampCPUDelta * 0.25; // Minus is up or higher on the map graphically
								particle.velYStep -= particle.velYScaledAbs;
							}
						}

						// Position: Next
						posXNext = particle.posX | 0;
						posYNext = particle.posY | 0;

						// Position: X wrap check
						if (posXNext < 0 || posXNext > gridSideLength) {
							if (settingsEdgesWrap === true) {
								posXNext = (posXNext + gridSideLength) % gridSideLength;
								particle.posX = posXNext;
							} else {
								if (posXNext < 0) {
									posXNext = 0;
									particle.posX = 0;
								} else {
									posXNext = gridSideLength;
									particle.posX = gridSideLength;
								}

								collisionX = true;
								collisionRelationshipX[0] = undefined;
								particle.velX = 0;
							}
						}

						// Position: Y floor check
						if (posYNext >= gridYLimit) {
							collisionY = true;
							collisionRelationshipY[0] = undefined;
							posYNext = gridYLimit;
							particle.velY = 0;
						}
						posNextIndex = posXNext * gridSideLength + posYNext;

						// What about gravity????
						// if(particle.velX === 0 && posYNext === gridSideLength && particle.velY === 0 && particle.type === ParticleType.SOLID) {
						// 	gridUpdate = true;
						// 	gridData[posNextIndex] = (particle.health << worldEncodingShiftHealth) | particle.typeValue; // Now just a regular solid
						// 	particles.remove(particleNode); // No longer a particle
						// }

						// Calc: Collision - X Relationships (chain of elements to consider when colliding)
						incrementX = particle.velX < 0 ? -1 : 1;
						if (posX !== posXNext && collisionX !== true) {
							gridIndex = posXNext * gridSideLength + posY;

							if (gridData[gridIndex] !== 0 || particleMap.has(gridIndex) === true) {
								collisionX = true;
								collisionRelationshipX[0] = gridIndex; // The first collision

								// Iterate over neighboring grid elements, null space, or particles
								for (i = 1, x = posXNext; i < collisionCalcDepth; i++, x += incrementX) {
									// Check for wrapping
									if (x < 0 || x > gridSideLength) {
										if (settingsEdgesWrap === true) {
											x = (x + gridSideLength) % gridSideLength;
										} else {
											collisionRelationshipX[i] = undefined; // Edge of map
											break;
										}
									}
									gridIndex = x * gridSideLength + posY;

									if (gridData[gridIndex] !== 0 || particleMap.has(gridIndex) === true) {
										collisionRelationshipX[i] = gridIndex; // Another collision
									} else {
										collisionRelationshipX[i] = null; // Nothing but air
										break;
									}
								}
							}
						}

						// Calc: Collision - Y Relationships (chain of elements to consider when colliding)
						incrementY = particle.velY < 0 ? -1 : 1;
						if (posY !== posYNext && collisionRelationshipY[0] !== undefined) {
							gridIndex = posX * gridSideLength + posYNext;

							if (gridData[gridIndex] !== 0 || particleMap.has(gridIndex) === true) {
								collisionY = true;
								collisionRelationshipY[0] = gridIndex; // The first collision

								// Iterate over neighboring grid elements, null space, or particles
								for (i = 1, y = posYNext; i < collisionCalcDepth; i++, y += posYNext) {
									// Check for y limit
									if (y >= gridYLimit) {
										collisionRelationshipY[i] = undefined; // Edge of map
										break;
									}
									gridIndex = posX * gridSideLength + y;

									if (gridData[gridIndex] !== 0 || particleMap.has(gridIndex) === true) {
										collisionRelationshipY[i] = gridIndex; // Another collision
									} else {
										collisionRelationshipY[i] = null; // Nothing but air
										break;
									}
								}
							}
						}

						// Calc: Collision - X & Y Relationships (chain of elements to consider when colliding)
						// Don't calc if X or Y are already interacting with the particle
						if (collisionX !== true && collisionY !== true && (posX !== posXNext || posY !== posYNext)) {
							gridIndex = posXNext * gridSideLength + posYNext;
							if (gridData[gridIndex] !== 0 || particleMap.has(gridIndex) === true) {
								collisionX = true;
								collisionY = true;
								collisionRelationshipXY[0] = gridIndex; // The first collision

								// Iterate over neighboring grid elements, null space, or particles
								for (i = 1, x = posXNext, y = posYNext; i < collisionCalcDepth; i++, x += incrementX, y += incrementY) {
									// Check for wrapping
									if (x < 0 || x > gridSideLength) {
										if (settingsEdgesWrap === true) {
											x = (x + gridSideLength) % gridSideLength;
										} else {
											collisionRelationshipXY[i] = undefined; // Edge of map
											break;
										}
									}

									// Check for y limit
									if (y >= gridYLimit) {
										collisionRelationshipXY[i] = undefined; // Edge of map
										break;
									}
									gridIndex = x * gridSideLength + y;

									if (gridData[gridIndex] !== 0 || particleMap.has(gridIndex) === true) {
										collisionRelationshipXY[i] = gridIndex; // Another collision
									} else {
										collisionRelationshipXY[i] = null; // Nothing but air

										break;
									}
								}
							}
						}

						// Calc: Collisions based on relationships
						if (collisionX === true || collisionY === true) {
							// if (collisionX === true) {
							// 	particle.posX = posX;
							// 	posXNext = posX;
							// }
							// if (collisionY === true) {
							// 	particle.posY = posY;
							// 	posYNext = posY;
							// }

							if (particle.type === ParticleType.SOLID || particle.type === ParticleType.TANK) {
							} else if (particle.type === ParticleType.WEAPON) {
								// boom
							}
						}

						// Gravity: Don't add gravity to particles traveling to quickly on the -y axis to simulate wind resistance
						if (posYNext !== gridYLimit && particle.velY > -5) {
							// console.log(particle.velY);
							particle.velY -= 0.005 * timestampCPUDelta;
						}

						// Done
						particleNode = particleNode.next;
					}

					if ((<any>particles.start).data.velXStep > 0 || (<any>particles.start).data.velYStep > 0) {
						particleNode = particles.start;
					}
				}

				// shot = shots.start;
				// while (shot !== undefined) {
				// 	shotComplete = true; // Just explode
				// 	shotData = shot.data;
				// 	shotTypeProperty = shotTypeProperties[shot.data.payload.type];
				// 	xPos = shotData.posX;
				// 	yPos = shotData.posY;

				// 	// Dirt: Activate
				// 	calcAnnihilationRadius = shotTypeProperty.annihilationRadius;
				// 	calcDamageExplosive = shotTypeProperty.damageExplosive;
				// 	calcExplosiveRadius = shotTypeProperty.explosiveRadius;
				// 	for (x = xPos - calcExplosiveRadius; x < xPos + calcExplosiveRadius; x++) {
				// 		xIndex = x * gridSideLength;

				// 		for (y = yPos - calcExplosiveRadius; y < yPos + calcExplosiveRadius; y++) {
				// 			if ((gridData[xIndex + y] & worldGridMaskActive) !== 0) {
				// 				calcDistance = ((x - xPos) ** 2 + (y - yPos) ** 2) ** 0.5;

				// 				if (calcDistance <= calcAnnihilationRadius) {
				// 					// This radius gets completely deleted

				// 					gridUpdate = true;
				// 					switch (gridData[xIndex + y] & worldGridMaskType) {
				// 						case SolidType.DIRT:
				// 						case SolidType.LAVA:
				// 						case SolidType.WATER:
				// 							gridData[xIndex + y] &= ~worldGridMaskActive; // Remove active state
				// 							break;
				// 						case SolidType.ROCK:
				// 							break;
				// 					}
				// 				} else if (calcDistance <= calcExplosiveRadius) {
				// 					// This radius gets energized particles

				// 					gridUpdate = true;
				// 					switch (gridData[xIndex + y] & worldGridMaskType) {
				// 						case SolidType.DIRT:
				// 						case SolidType.LAVA:
				// 						case SolidType.WATER:
				// 							// Arctan of the explosion origin to pixel center
				// 							calcArcTan = Math.atan2(y + 0.5 - yPos, xPos - (x + 0.5)) + GamingCanvasConstPI_1_000;
				// 							if (calcArcTan < 0) {
				// 								calcArcTan += GamingCanvasConstPI_2_000;
				// 							} else if (calcArcTan >= GamingCanvasConstPI_2_000) {
				// 								calcArcTan -= GamingCanvasConstPI_2_000;
				// 							}
				// 							// shotData.arctan = calcArcTan; // this value should be calc'd between current and previous positions
				// 							// pixel.velX += calcDamageExplosive * mathCOS(x); // attach to new object??
				// 							// pixel.velY += calcDamageExplosive * mathSIN(x); // attach to new object??
				// 							break;
				// 						case SolidType.ROCK:
				// 							break;
				// 					}
				// 				}
				// 			}
				// 		}
				// 	}

				// 	// Done
				// 	if (shotComplete === true) {
				// 		shots.remove(<any>shot);
				// 	}
				// 	shot = shot.next;
				// }

				// Done
				statAll.watchStop();
			}

			// Stats
			if (timestampNow - timestampStats > 999) {
				timestampStats = timestampNow;

				statAllRaw = <Float32Array>statAll.encode();

				// Output
				WorkerDirtCalcEngine.post(
					[
						{
							cmd: WorkerDirtCalcBusOutputCmd.STATS,
							data: {
								all: statAllRaw,
								particleCountSolids: particleCountSolids,
								particleCountWeapons: particleCountWeapons,
							},
						},
					],
					[statAllRaw.buffer],
				);
			}

			// Video
			timestampFPSDelta = timestampNow - timestampFPSThen;
			if ((gridUpdate === true || particles.length !== 0) && timestampFPSDelta >= settingsFPMS) {
				buffers.length = 0;
				// More accurately calculate for more stable FPS
				timestampFPSThen = timestampNow - (timestampFPSDelta % settingsFPMS);

				// Encode: Grid
				if (gridUpdate === true) {
					gridUpdate = false;

					gridClone = grid.clone();
					buffers.push(gridClone.data.buffer);
				} else {
					gridClone = undefined;
				}

				// Encode: Particles
				if (particles.length !== 0) {
					particleNode = particles.start;
					particle = (<GamingCanvasDoubleLinkedListNode<Particle<any>>>particleNode).data;
					particlesEncoded = new Uint32Array(particles.length);

					// Encode
					for (i = 0; i < particlesEncoded.length; i++) {
						particlesEncoded[i] =
							(particle.health << particleEncodingShiftHealth) |
							(particle.type << particleEncodingShiftType) |
							(particle.typeValue << particleEncodingShiftTypeValue) |
							((particle.posX | 0) << particleEncodingShiftX) |
							(particle.posY | 0);

						// Done
						particleNode = (<GamingCanvasDoubleLinkedListNode<Particle<any>>>particleNode).next;
						if (particleNode !== undefined) {
							particle = (<GamingCanvasDoubleLinkedListNode<Particle<any>>>particleNode).data;
						}
					}
					buffers.push(particlesEncoded.buffer);
				} else {
					particlesEncoded = undefined;
				}

				// Upload grid
				WorkerDirtCalcEngine.post(
					[
						{
							cmd: WorkerDirtCalcBusOutputCmd.DATA,
							data: {
								grid: gridClone,
								particles: particlesEncoded,
							},
						},
					],
					buffers,
				);
			}
		};

		WorkerDirtCalcEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
