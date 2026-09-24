import { GamingCanvasDoubleLinkedList, GamingCanvasDoubleLinkedListNode, GamingCanvasStat } from '../../gaming-canvas/main/index.js';
import { GamingCanvasGridUint32Array } from '../../gaming-canvas/modules/grid/grid.js';
import {
	Solid,
	SolidType,
	World,
	worldEncodingMaskHealth,
	worldEncodingMaskType,
	worldEncodingShiftHealth,
	worldEncodingValueHealth,
} from '../../models/world.model.js';
import {
	Particle,
	particleEncodingMaskType,
	particleEncodingShiftHealth,
	particleEncodingShiftType,
	particleEncodingShiftTypeValue,
	particleEncodingShiftX,
	ParticleInitial,
	ParticleInitialBase,
	ParticleType,
} from '../../models/physics.model.js';
import { WindStrength, WorldSize } from '../../models/settings.model.js';
import { Weapon } from '../../models/weapon.model.js';
import {
	WorkerMainCalcBusInputCmd,
	WorkerMainCalcBusInputDataInit,
	WorkerMainCalcBusInputDataWorld,
	WorkerMainCalcBusInputDataSettings,
	WorkerMainCalcBusInputPayload,
	WorkerMainCalcBusOutputCmd,
	WorkerMainCalcBusOutputPayload,
	WorkerMainCalcBusStats,
} from './main-calc.model.js';
import { Tank, TankType } from '../../models/tank.model.js';

/**
 * @author tknight-dev
 */

/*
 * Input: from Main Thread
 */
self.onmessage = (event: MessageEvent) => {
	const payload: WorkerMainCalcBusInputPayload = event.data;

	switch (payload.cmd) {
		case WorkerMainCalcBusInputCmd.INIT:
			WorkerMainCalcEngine.initialize(<WorkerMainCalcBusInputDataInit>payload.data);
			break;
		case WorkerMainCalcBusInputCmd.MAP:
			WorkerMainCalcEngine.inputWorld(<WorkerMainCalcBusInputDataWorld>payload.data);
			break;
		case WorkerMainCalcBusInputCmd.PARTICLE:
			WorkerMainCalcEngine.inputParticle(<ParticleInitial<Weapon> | ParticleInitial<Weapon>[]>payload.data);
			break;
		case WorkerMainCalcBusInputCmd.SETTINGS:
			WorkerMainCalcEngine.inputSettings(<WorkerMainCalcBusInputDataSettings>payload.data);
			break;
	}
};

class WorkerMainCalcEngine {
	private static animationFrameRequest: number;
	private static particles: GamingCanvasDoubleLinkedList<Particle<any>> = new GamingCanvasDoubleLinkedList();
	private static particlePool: GamingCanvasDoubleLinkedList<Particle<any>> = new GamingCanvasDoubleLinkedList();
	private static settings: WorkerMainCalcBusInputDataSettings;
	private static settingsNew: boolean;
	private static stats: { [key: number]: GamingCanvasStat } = {};
	private static tanks: Map<number, Tank> = new Map();
	private static world: World;
	private static worldNew: boolean;

	public static async initialize(data: WorkerMainCalcBusInputDataInit): Promise<void> {
		// Stats
		WorkerMainCalcEngine.stats[WorkerMainCalcBusStats.ALL] = new GamingCanvasStat(50);

		// Config: World
		WorkerMainCalcEngine.inputWorld(data as WorkerMainCalcBusInputDataWorld);

		// Config: Settings
		WorkerMainCalcEngine.inputSettings(data as WorkerMainCalcBusInputDataSettings);

		// Pool: Particles
		let particlePool: GamingCanvasDoubleLinkedList<Particle<any>> = WorkerMainCalcEngine.particlePool,
			particlePoolSize: number = WorkerMainCalcEngine.settings.particlePoolSize;
		for (let i = 0; i < particlePoolSize; i++) {
			particlePool.pushEnd({
				arctan: 0,
				arctanOriginal: 0,
				gridIndex: 0,
				health: 0,
				id: 0,
				node: <any>undefined,
				payload: undefined,
				posX: 0,
				posXOriginal: 0,
				posY: 0,
				posYOriginal: 0,
				type: 0,
				typeValue: 0,
				velX: 0,
				velXScaled: 0,
				velY: 0,
				velYScaled: 0,
			});
		}

		// Done
		WorkerMainCalcEngine.animationLoop();
		WorkerMainCalcEngine.post([
			{
				cmd: WorkerMainCalcBusOutputCmd.INIT_COMPLETE,
				data: true,
			},
		]);
	}

	/*
	 * Input
	 */
	public static inputParticle(data: ParticleInitial<Weapon> | ParticleInitial<Weapon>[]): void {
		let datam: ParticleInitial<Weapon>, particle: Particle<Weapon>, tank: Tank | undefined;

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
			WorkerMainCalcEngine.tanks.set(tank.id, tank);
		}

		if (Array.isArray(data) !== true) {
			data = [data];
		}

		for (datam of data) {
			particle = <Particle<Weapon>>datam;

			particle.arctanOriginal = particle.arctan;
			particle.posXOriginal = particle.posX;
			particle.posYOriginal = particle.posY;
			particle.velX = particle.payload.powerPercentage * tank.statPower * Math.cos(particle.arctan);
			particle.velY = particle.payload.powerPercentage * tank.statPower * Math.sin(particle.arctan);

			// Fix rounding errors
			if (Math.abs(particle.velX) < 0.00001) {
				particle.velX = 0;
			}
			if (Math.abs(particle.velY) < 0.00001) {
				particle.velY = 0;
			}

			WorkerMainCalcEngine.particles.pushEnd(particle);
		}
	}

	public static inputSettings(data: WorkerMainCalcBusInputDataSettings): void {
		WorkerMainCalcEngine.settings = data;
		WorkerMainCalcEngine.settingsNew = true;
	}

	public static inputWorld(data: WorkerMainCalcBusInputDataWorld): void {
		WorkerMainCalcEngine.world = data.world;
		WorkerMainCalcEngine.world.grid = GamingCanvasGridUint32Array.from(data.world.grid.data);
		WorkerMainCalcEngine.worldNew = true;
	}

	/*
	 * Output: to Main Thread
	 */
	private static post(payloads: WorkerMainCalcBusOutputPayload[], data?: Transferable[]): void {
		self.postMessage(payloads, (data || []) as any);
	}

	/*
	 * Main Loop
	 */
	private static animationLoop(): void {
		let buffers: ArrayBufferLike[] = [],
			collisionX: boolean,
			collisionY: boolean,
			collisionLiquidRedistribution: boolean,
			collisionNextEdge: boolean,
			collisionNextGridIndex: number,
			collisionNextParticle: Particle<any> | undefined,
			collisionNextResultBrick: boolean,
			collisionNextResultLiquidSwap: boolean,
			collisionNextResultHardStop: boolean,
			collisionNextType: number,
			collisionWeapons: Set<number> = new Set(), // gridIndex
			cpuCycleTimeInMs: number = 10,
			grid: GamingCanvasGridUint32Array,
			gridClone: GamingCanvasGridUint32Array | undefined,
			gridData: Uint32Array, // AKA inactive solids
			gridIndex: number,
			gridIndexEff: number,
			gridSideLength: number,
			gridUpdate: boolean,
			gridYLimit: number,
			heightMapGrid: number[],
			heightMapParticles: number[],
			i: number,
			j: number,
			particle: Particle<any>,
			particleId: number = 0,
			particleLiquid: Particle<any> | undefined,
			particleMap: Map<number, Particle<any>> = new Map(), // <gridPostion, particle>
			particleMapUpdate: boolean,
			particleMotionComplete: boolean,
			particleNext: Particle<any> | undefined,
			particlePrevious: Particle<any> | undefined,
			particleNode: GamingCanvasDoubleLinkedListNode<Particle<any>> | undefined,
			particleNodeNext: GamingCanvasDoubleLinkedListNode<Particle<any>> | undefined,
			particleLast: Particle<any>,
			particlePool: GamingCanvasDoubleLinkedList<Particle<any>> = WorkerMainCalcEngine.particlePool,
			particlePoolInstance: Particle<any> | undefined,
			particlePoolInstanceNode: GamingCanvasDoubleLinkedListNode<Particle<any>> | undefined,
			particles: GamingCanvasDoubleLinkedList<Particle<any>> = new GamingCanvasDoubleLinkedList(),
			particlesEncoded: Uint32Array | undefined,
			physicsGravity: number = 0.0005,
			physicsGravityLiquid: boolean,
			physicsGravityLimit: number = -1,
			physicsLiquidAvailable: boolean,
			physicsLiquidDirection: number,
			physicsLiquidDirectionMomentum: number = 0.0105,
			physicsLiquidDirectionMomentumMax: number = 0.01,
			physicsLiquidDirections: number[] = [1, -1],
			physicsLiquidGridIndex: number,
			physicsLiquidGridIndexLeft: number,
			physicsLiquidGridIndexRight: number,
			physicsLiquidMoved: boolean,
			physicsLiquidOverAirCount: number,
			physicsLiquidParticle: Particle<any> | undefined,
			physicsResistanceFriction: number = 0.95, // The closer to 1 the less this has effect
			physicsResistanceLiquidLimitY: number = 0.2,
			physicsResistanceLiquidSurfaceTensionX: number = 0.95, // The closer to 0 the less horizontal motion per swap
			physicsResistanceLiquidSurfaceTensionY: number = 0.05, // The closer to 1 the less this has effect
			physicsResistanceSecondary: number = 0.5, // Collision X will reduce velocity Y by this amount
			physicsSplashes: number[] = [],
			physicsSplashesEncoded: Uint32Array | undefined,
			physicsTranslated: boolean,
			physicsVelocityMin: number = 0.01,
			posNextIndex: number,
			posX: number,
			posXInteger: number,
			posXIntegerNext: number,
			posXIntegerNextOriginal: number,
			posXOriginal: number,
			posY: number,
			posYInteger: number,
			posYIntegerNext: number,
			posYIntegerNextOriginal: number,
			posYOriginal: number,
			randomNumberLength: number = 100,
			randomNumbers: number[] = [...Array(randomNumberLength)].map((e) => Math.random()),
			randomNumbersIndex: number = 0,
			timestampCPU: number = performance.now(),
			timestampCPUDelta: number,
			timestampFPSDelta: number,
			timestampFPSThen: number = performance.now(),
			timestampStats: number = performance.now(),
			settingsEdgesWrap: boolean,
			settingsFPMS: number = 16.666,
			settingsParticlePoolSize: number,
			settingsWindRandomize: boolean,
			settingsWindStrength: WindStrength,
			solidType: number,
			statAll: GamingCanvasStat = WorkerMainCalcEngine.stats[WorkerMainCalcBusStats.ALL],
			statAllRaw: Float32Array,
			velChanged: boolean,
			velMaxAbs: number,
			velStep: number,
			velStepFirst: boolean,
			velStepOriginal: number,
			velStepPrevious: number,
			velStepPreviousOriginal: number,
			velY: number,
			world: World,
			worldBedrock: boolean,
			x: number,
			xIncrement: number,
			xNext: number,
			xVel: number,
			y: number,
			yIncrement: number,
			yNext: number,
			yVel: number;

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
		// 	shots: GamingCanvasDoubleLinkedList<ParticleCalculated<Weapon>> = WorkerMainCalcEngine.shots,

		const particleFromPool = (
			gridIndex: number = 0,
			health: number = worldEncodingValueHealth,
			particleType: ParticleType = ParticleType.SOLID,
			particleTypeValue: number = 0,
			posX: number = 0,
			posY: number = 0,
		): Particle<any> => {
			particlePoolInstanceNode = particlePool.popStartNode();
			if (particlePoolInstanceNode === undefined) {
				particlePoolInstanceNode = {
					data: {
						arctan: 0,
						arctanOriginal: 0,
						gridIndex: gridIndex,
						health: health,
						id: particleId++,
						node: <any>undefined,
						payload: undefined,
						posX: posX,
						posXOriginal: posX,
						posY: posY,
						posYOriginal: posY,
						type: particleType,
						typeValue: particleTypeValue,
						velX: 0,
						velXScaled: 0,
						velY: 0,
						velYScaled: 0,
					},
				};
				particlePoolInstance = particlePoolInstanceNode.data;
			} else {
				particlePoolInstance = particlePoolInstanceNode.data;
				particlePoolInstance.arctan = 0;
				particlePoolInstance.arctanOriginal = 0;
				particlePoolInstance.gridIndex = gridIndex;
				particlePoolInstance.health = health;
				particlePoolInstance.id = particleId++;
				particlePoolInstance.payload = undefined;
				particlePoolInstance.posX = posX;
				particlePoolInstance.posXOriginal = posX;
				particlePoolInstance.posY = posY;
				particlePoolInstance.posYOriginal = posY;
				particlePoolInstance.type = particleType;
				particlePoolInstance.typeValue = particleTypeValue;
				particlePoolInstance.velX = 0;
				particlePoolInstance.velXScaled = 0;
				particlePoolInstance.velY = 0;
				particlePoolInstance.velYScaled = 0;
			}

			// Done
			particleMap.set(gridIndex, particlePoolInstance);
			particlePoolInstance.node = particles.pushEndNode(particlePoolInstanceNode);

			return particlePoolInstance;
		};

		const go = (timestampNow: number) => {
			// Always start the request for the next frame first!
			WorkerMainCalcEngine.animationFrameRequest = requestAnimationFrame(go);

			// Config
			if (WorkerMainCalcEngine.settingsNew === true) {
				WorkerMainCalcEngine.settingsNew = false;

				settingsEdgesWrap = WorkerMainCalcEngine.settings.edgesWrap;
				settingsFPMS = Math.round((1000 / WorkerMainCalcEngine.settings.fps) * 1000) / 1000;
				settingsParticlePoolSize = WorkerMainCalcEngine.settings.particlePoolSize;
				settingsWindRandomize = WorkerMainCalcEngine.settings.windRandomize;
				settingsWindStrength = WorkerMainCalcEngine.settings.windStrength;

				// Cycle the physics system 25% faster than the desired FPS rate
				cpuCycleTimeInMs = (settingsFPMS * 0.75) | 0;
			}

			if (WorkerMainCalcEngine.worldNew === true) {
				WorkerMainCalcEngine.worldNew = false;

				world = WorkerMainCalcEngine.world;
				worldBedrock = world.bedrock;

				// Grid
				grid = world.grid;
				gridData = grid.data;
				gridSideLength = grid.sideLength;
				gridUpdate = true;
				gridYLimit = (gridSideLength * 9) / 16;

				// Return all particles to the pool
				particleNode = particles.start;
				while (particleNode !== undefined) {
					particlePool.pushEnd(particleNode.data);
					particleNode = particleNode.next;
				}
				particles.clear();
				particleId = 0;

				// Convert all liquids on the map to particles
				for (x = 0; x < gridSideLength; x++) {
					for (y = 0; y < gridSideLength; y++) {
						gridIndex = x * gridSideLength + y;
						collisionNextType = gridData[gridIndex] & worldEncodingMaskType;

						if (collisionNextType === SolidType.LAVA || collisionNextType === SolidType.WATER) {
							if (y < gridYLimit === true) {
								particlePoolInstance = particleFromPool(
									gridIndex,
									(gridData[gridIndex] & worldEncodingMaskHealth) >> worldEncodingShiftHealth,
									ParticleType.SOLID,
									collisionNextType,
									x,
									y,
								);
							}

							gridData[gridIndex] = 0;
						}
					}
				}
			}

			if (WorkerMainCalcEngine.particles.length !== 0) {
				particleNode = WorkerMainCalcEngine.particles.start;
				while (particleNode !== undefined) {
					particleNodeNext = particleNode.next;
					gridIndex = (particleNode.data.posX | 0) * gridSideLength + (particleNode.data.posY | 0);

					// Can't conflict with the grid or another particle unless the spawning particle is a weapon
					collisionNextParticle = particleMap.get(gridIndex);
					if (gridData[gridIndex] === 0 && (collisionNextParticle === undefined || collisionNextParticle.typeValue === SolidType.WEAPON)) {
						particleMap.set(gridIndex, particleNode.data);
						particleNode.data.node = particles.pushEndNode(particleNode);

						particleNode.data.gridIndex = gridIndex;
						particleNode.data.id = particleId++;
					}

					// Done
					particleNode = particleNodeNext;
				}
				WorkerMainCalcEngine.particles.clear();
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

				// Calc: Pre-motion Physics
				particleNode = particles.start;
				while (particleNode !== undefined) {
					particle = particleNode.data;
					gridIndex = (particle.posX | 0) * gridSideLength + (particle.posY | 0);

					// Friction: Limit the effect of gravity to simulate terminal velocity
					xVel = particle.velX < 0 ? -particle.velX : particle.velX;
					if (gridData[gridIndex + 1] !== 0 && xVel > physicsVelocityMin) {
						particle.velX *= physicsResistanceFriction;
					}

					// Gravity: Limit the effect of gravity to simulate terminal velocity
					if ((particle.posY | 0) !== gridYLimit && particle.velY > physicsGravityLimit) {
						physicsGravityLiquid = false;
						if (particle.type === ParticleType.SOLID && particle.typeValue !== SolidType.WATER && particle.typeValue !== SolidType.LAVA) {
							collisionNextParticle = particleMap.get(gridIndex + 1);

							if (
								collisionNextParticle !== undefined &&
								collisionNextParticle.type === ParticleType.SOLID &&
								(collisionNextParticle.typeValue === SolidType.WATER || collisionNextParticle.typeValue === SolidType.LAVA)
							) {
								physicsGravityLiquid = true;
							}
						}

						if (physicsGravityLiquid === true) {
							// Falling through LIQUID
							yVel = particle.velY < 0 ? -particle.velY : particle.velY;
							if (yVel < physicsResistanceLiquidLimitY) {
								particle.velY -= (timestampCPUDelta * physicsGravity) / 2;
								// vconsole.log('  >> LIQUID');
							}
						} else {
							// Falling through AIR
							particle.velY -= timestampCPUDelta * physicsGravity;
							// console.log('  >> AIR', particle.velY);
						}
					}

					// Done
					particleNode = particleNode.next;
				}

				// Calc: Motion
				velMaxAbs = 0;

				// Calc: velMaxAbs
				particleNode = particles.start;
				while (particleNode !== undefined) {
					particle = particleNode.data;

					xVel = particle.velX < 0 ? -particle.velX : particle.velX;
					if (xVel > velMaxAbs === true) {
						velMaxAbs = xVel;
					}

					yVel = particle.velY < 0 ? -particle.velY : particle.velY;
					if (yVel > velMaxAbs === true) {
						velMaxAbs = yVel;
					}

					// Done
					particleNode = particleNode.next;
				}

				/**
				 * Calc: Velocity Scale
				 *
				 * All velocities are scaled such that the fastest velocity is equal to 1. Each cycle then moves particles a maximum of one pixel at a time
				 */
				particleNode = particles.start;
				while (particleNode !== undefined) {
					particle = particleNode.data;

					if (velMaxAbs === 0) {
						particle.velXScaled = 0;
						particle.velYScaled = 0;
					} else if (velMaxAbs < 1) {
						particle.velXScaled = particle.velX;
						particle.velYScaled = particle.velY;
					} else {
						// X
						if (particle.velX === 0) {
							particle.velXScaled = 0;
						} else {
							particle.velXScaled = particle.velX / velMaxAbs;
						}

						// Y
						if (particle.velY === 0) {
							particle.velYScaled = 0;
						} else {
							particle.velYScaled = particle.velY / velMaxAbs;
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
					particleMapUpdate = true;

					// Position: Current
					posXInteger = particle.posX | 0;
					posYInteger = particle.posY | 0;

					// Calc: Motion
					particle.posX += particle.velXScaled * velMaxAbs;
					particle.posY -= particle.velYScaled * velMaxAbs;

					// Position: Next
					posXIntegerNext = particle.posX | 0;
					posYIntegerNext = particle.posY | 0;
					particleMap.delete(particle.gridIndex);
					particle.gridIndex = posXIntegerNext * gridSideLength + posYIntegerNext;

					// Calc: New Position
					if (posXInteger !== posXIntegerNext || posYInteger !== posYIntegerNext) {
						// Position: X wrap check
						if (posXIntegerNext < 0 || posXIntegerNext >= gridSideLength) {
							if (settingsEdgesWrap === true) {
								posXIntegerNext = (posXIntegerNext + gridSideLength) % gridSideLength;
								particle.posX = posXIntegerNext;
							} else {
								if (posXIntegerNext < 0) {
									posXIntegerNext = 0;
									particle.posX = 0;
								} else {
									posXIntegerNext = gridSideLength;
									particle.posX = gridSideLength;
								}

								collisionNextEdge = true;
								collisionX = true;
								particle.velX = 0;
							}

							particle.gridIndex = posXIntegerNext * gridSideLength + posYIntegerNext;
						}

						// Position: Y max check
						if (posYIntegerNext >= gridYLimit) {
							if (worldBedrock === true) {
								collisionNextEdge = true;
								collisionNextGridIndex = posXIntegerNext * gridSideLength + posYIntegerNext;
								collisionNextParticle = undefined;
								collisionNextType = SolidType.ROCK;
								collisionY = true;
								posYIntegerNext = gridYLimit - 1;
								particle.posY = posYIntegerNext;
								particle.velY = 0;

								particle.gridIndex = posXIntegerNext * gridSideLength + posYIntegerNext;
							} else {
								if (particle.type === ParticleType.TANK) {
									// TODO: TANK DIED lol
								}

								// Remove particle
								particles.remove(particle.node);
								if (particlePool.length < settingsParticlePoolSize) {
									// Recover the particle if the pool is low
									particlePool.pushEndNode(particle.node);
								}

								// Done
								particleNode = particleNode.next;
								continue; // skip the collision logic, the particle doesn't exist anymore
							}
						}

						// Calc: Collisions
						if (particle.type === ParticleType.TANK) {
							// Tank width != 1px
						} else {
							// Calc: Collision - X
							if (particle.velX !== 0 && posYInteger > -1 && collisionX !== true && posXInteger !== posXIntegerNext) {
								gridIndex = posXIntegerNext * gridSideLength + posYInteger;
								collisionNextParticle = particleMap.get(gridIndex);

								if (gridData[gridIndex] !== 0 || (collisionNextParticle !== undefined && collisionNextParticle.id !== particle.id)) {
									collisionNextEdge = false;
									collisionNextGridIndex = gridIndex;
									collisionX = true;

									if (collisionNextParticle !== undefined) {
										collisionNextType = collisionNextParticle.typeValue;
									} else {
										collisionNextType = gridData[gridIndex] & worldEncodingMaskType;
									}
								}
							}

							// Calc: Collision - Y
							if (particle.velY !== 0 && posYInteger > -1 && collisionY !== true && posYInteger !== posYIntegerNext) {
								gridIndex = posXInteger * gridSideLength + posYIntegerNext;
								collisionNextParticle = particleMap.get(gridIndex);

								if (gridData[gridIndex] !== 0 || (collisionNextParticle !== undefined && collisionNextParticle.id !== particle.id)) {
									collisionNextEdge = false;
									collisionNextGridIndex = gridIndex;
									collisionY = true;

									if (collisionNextParticle !== undefined) {
										collisionNextType = collisionNextParticle.typeValue;
									} else {
										collisionNextType = gridData[gridIndex] & worldEncodingMaskType;
									}
								}
							}

							// Don't calc if X or Y are already interacting with the particle
							if (particle.velX !== 0 && particle.velY !== 0 && posYInteger > -1 && collisionX !== true && collisionY !== true) {
								gridIndex = posXIntegerNext * gridSideLength + posYIntegerNext;
								collisionNextParticle = particleMap.get(gridIndex);

								if (gridData[gridIndex] !== 0 || (collisionNextParticle !== undefined && collisionNextParticle.id !== particle.id)) {
									collisionNextEdge = false;
									collisionNextGridIndex = gridIndex;
									collisionX = true;
									collisionY = true;

									if (collisionNextParticle !== undefined) {
										collisionNextType = collisionNextParticle.typeValue;
									} else {
										collisionNextType = gridData[gridIndex] & worldEncodingMaskType;
									}
								}
							}
						}

						// Calc: Collisions
						if (collisionX === true || collisionY === true) {
							// TMP
							if (particle.typeValue === SolidType.WEAPON) {
								particle.typeValue = SolidType.DIRT; // TMP
							} // TMP
							if (collisionNextType === SolidType.WEAPON) {
								collisionNextType = SolidType.ROCK; // TMP
							} // TMP

							if (collisionNextType === SolidType.WEAPON) {
								// console.log('COLLISION', 'WEAPON', particle.id);
								// Colliding with a weapon is a collision false positive in all cases
								collisionWeapons.add(collisionNextGridIndex);

								if (collisionNextParticle !== undefined) {
									particleMap.delete(collisionNextGridIndex);
									particles.remove(collisionNextParticle.node);
									if (particlePool.length < settingsParticlePoolSize) {
										// Recover the particle if the pool is low
										particlePool.pushEndNode(collisionNextParticle.node);
									}
								} else {
									gridData[collisionNextGridIndex] = 0;
									gridUpdate = true;
								}
							} else if (particle.typeValue === SolidType.DIRT || particle.typeValue === SolidType.ROCK) {
								// console.log('COLLISION', particle.typeValue === SolidType.DIRT ? 'DIRT' : 'ROCK', particle.id);
								switch (collisionNextType) {
									case SolidType.DIRT:
										if (collisionNextParticle !== undefined) {
											// console.log('  >> ON DIRT A');
											if (collisionX === true) {
												particle.posX = posXInteger;
												particle.velX *= 0.5;
												collisionNextParticle.velX += particle.velX;
											}
											if (collisionY === true) {
												particle.posY = posYInteger;
												particle.velY *= 0.5;
												collisionNextParticle.velY += particle.velY;
											}
										} else {
											// console.log('  >> ON DIRT B');
											collisionNextResultHardStop = true;

											/**
											 * Dirt ceiling collapse
											 */
											yNext = collisionNextGridIndex % gridSideLength;
											if (collisionY === true && particle.velY > 0) {
												gridIndex = collisionNextGridIndex;
												xNext = (collisionNextGridIndex - yNext) / gridSideLength;
												for (; yNext > -1; gridIndex--, yNext--) {
													if (
														particleMap.has(gridIndex) === true ||
														(gridData[gridIndex] & worldEncodingMaskHealth) === 0 ||
														(gridData[gridIndex] & worldEncodingMaskType) !== SolidType.DIRT
													) {
														break;
													}

													// Convert grid solid to particle
													particlePoolInstance = particleFromPool(
														gridIndex,
														(gridData[gridIndex] & worldEncodingMaskHealth) >> worldEncodingShiftHealth,
														ParticleType.SOLID,
														gridData[gridIndex] & worldEncodingMaskType,
														xNext,
														yNext,
													);

													// Done
													gridData[gridIndex] = 0;
													gridUpdate = true;
												}
											}
										}
										break;
									case SolidType.LAVA:
										// console.log('  >> ON LAVA');
										if (collisionNextParticle === undefined) {
											console.error('MainCalc > collision: DIRT on LAVA failed');
											if (particleMapUpdate === true) {
												particleMap.set(particle.gridIndex, particle);
											}
											particleNode = particleNode.next;
											continue;
										}

										if (particle.typeValue === SolidType.DIRT) {
											collisionNextResultHardStop = true;
											particle.typeValue = SolidType.LAVA;

											if (collisionX === true) {
												particle.posX = posXInteger;
												particle.velX = 0;
											}
											if (collisionY === true) {
												particle.posY = posYInteger;
												particle.velY = 0;
											}
										} else {
											// ROCK
											collisionNextResultLiquidSwap = true;
										}
										break;
									case SolidType.ROCK:
										// console.log('  >> ON ROCK');
										collisionNextResultHardStop = true;
										break;
									case SolidType.WATER:
										// console.log('  >> ON WATER');
										collisionNextResultLiquidSwap = true;
										break;
									case SolidType.WEAPON:
										console.error('MainCalc > collision: DIRT on WEAPON failed');
										break;
								}
							} else if (particle.typeValue === SolidType.LAVA || particle.typeValue === SolidType.WATER) {
								if (particle.typeValue === SolidType.LAVA) {
									switch (collisionNextType) {
										case SolidType.DIRT:
										case SolidType.ROCK:
											// console.log('COLLISION', 'LAVA > DIRT/ROCK', particle.id);
											collisionNextResultHardStop = true;
											break;
										case SolidType.LAVA:
											// console.log('COLLISION', 'LAVA > LAVA', particle.id);
											if (collisionNextParticle !== undefined) {
												if (collisionX === true) {
													particle.posX = posXInteger;
													particle.velX *= 0.5;
													collisionNextParticle.velX += particle.velX;
												}
												if (collisionY === true) {
													particle.posY = posYInteger;
													particle.velY *= 0.5;
													collisionNextParticle.velY += particle.velY;
												}
											}
											break;
										case SolidType.WATER:
											// console.log('COLLISION', 'LAVA > WATER', particle.id);

											// Convert LAVA to ROCK
											particle.typeValue = SolidType.ROCK;

											// Half the time the water evaporates
											if (randomNumbers[randomNumbersIndex++ % randomNumberLength] > 0.5 === true) {
												if (collisionNextParticle !== undefined) {
													particleMap.delete(collisionNextParticle.gridIndex);
													particles.remove(collisionNextParticle.node);
													if (particlePool.length < settingsParticlePoolSize) {
														// Recover the particle if the pool is low
														particlePool.pushEndNode(collisionNextParticle.node);
													}
												}
											} else {
												collisionNextResultLiquidSwap = true;
											}
											break;
										case SolidType.WEAPON:
											console.error('MainCalc > collision: LAVA on WEAPON failed');
											break;
									}
								} else {
									switch (collisionNextType) {
										case SolidType.DIRT:
										case SolidType.ROCK:
											// console.log('COLLISION', 'WATER > SOLID', particle.id);
											collisionNextResultHardStop = true;
											break;
										case SolidType.LAVA:
											// console.log('COLLISION', 'WATER > LAVA', particle.id);
											// Convert LAVA to ROCK and Remove water
											if (collisionNextParticle !== undefined) {
												collisionNextParticle.typeValue = SolidType.ROCK;
											}

											particles.remove(particle.node);
											if (particlePool.length < settingsParticlePoolSize) {
												// Recover the particle if the pool is low
												particlePool.pushEndNode(particle.node);
											}
											particleNode = particleNode.next;
											continue;
										case SolidType.WATER:
											// console.log('COLLISION', 'WATER > WATER', particle.id);
											if (collisionNextParticle !== undefined) {
												if (collisionX === true) {
													particle.posX = posXInteger;
													particle.velX *= 0.5;
													collisionNextParticle.velX += particle.velX;
												}
												if (collisionY === true) {
													particle.posY = posYInteger;
													particle.velY *= 0.5;
													collisionNextParticle.velY += particle.velY;
												}
											}
											break;
										case SolidType.WEAPON:
											console.error('MainCalc > collision: WATER on WEAPON failed');
											break;
									}
								}

								/**
								 * Liquid redistributions
								 */
								if (
									collisionY === true && // Falling collision
									collisionNextResultLiquidSwap !== true &&
									posYIntegerNext > posYInteger // Colliding downwards
								) {
									x = particle.posX | 0;
									y = particle.posY | 0;
									gridIndex = x * gridSideLength;

									// Only calculate for the top-most layer of liquid
									physicsLiquidAvailable = true;
									particleLiquid = particleMap.get(gridIndex + (y - 1));
									if (particleLiquid === undefined || particleLiquid.typeValue !== particle.typeValue) {
										// Water column must be resting on the ground
										physicsLiquidAvailable = false;
										for (yNext = y + 1; yNext < gridYLimit; yNext++) {
											gridIndexEff = gridIndex + yNext;

											if (gridData[gridIndexEff] !== 0) {
												physicsLiquidAvailable = true;
												yNext--; // Offset to reference the last y value before reaching the ground
												break;
											} else if (particleMap.has(gridIndexEff) !== true) {
												break;
											}
										}

										// Exception for bedrock at the bottom of the map
										if (worldBedrock === true && yNext === gridYLimit) {
											physicsLiquidAvailable = true;
											yNext--;
										}

										if (physicsLiquidAvailable === true) {
											// Same-type redistribution
											if (collisionNextType === particle.typeValue) {
												// Random initial direction
												if (randomNumbers[randomNumbersIndex++ % randomNumberLength] > 0.5 === true) {
													physicsLiquidDirection = physicsLiquidDirections[0];
													physicsLiquidDirections[0] = physicsLiquidDirections[1];
													physicsLiquidDirections[1] = physicsLiquidDirection;
												}

												// Iterate from the bottom to the top to find an available position
												physicsLiquidMoved = false;
												for (; yNext !== y; yNext--) {
													// Iterate left and right to find an available position
													for (physicsLiquidDirection of physicsLiquidDirections) {
														physicsLiquidOverAirCount = 0;

														// Iterate in a horizontal direction to find an available position
														// xNext = x + direction so as to not reference the immediate vertical column of liquids
														for (
															xNext = x + physicsLiquidDirection;
															xNext !== -1 && xNext !== gridSideLength;
															xNext += physicsLiquidDirection
														) {
															gridIndex = xNext * gridSideLength + yNext;

															// Check if the next position is a particle
															particleLiquid = particleMap.get(gridIndex);
															if (particleLiquid !== undefined) {
																if (particle.typeValue === particleLiquid.typeValue) {
																	// How far out over the air are we stretching?
																	if (gridData[gridIndex + 1] === 0 && particleMap.has(gridIndex + 1) !== true) {
																		physicsLiquidOverAirCount++;

																		// Limit how wide a waterfall of liquids can be based on the height of the original particle
																		// Randomize effect to simulate turbulence
																		if (
																			randomNumbers[randomNumbersIndex++ % randomNumberLength] > 0.5 === true ||
																			physicsLiquidOverAirCount >= yNext - y
																		) {
																			break;
																		}
																	}

																	continue;
																}

																// Lava collides with water
																if (particle.typeValue === SolidType.LAVA && particleLiquid.typeValue === SolidType.WATER) {
																	particle.typeValue = SolidType.ROCK;

																	// Move Particle to new position
																	collisionNextResultHardStop = false;
																	particle.posX = xNext + (particle.posX % 1);
																	particle.posY = yNext + (particle.posY % 1);

																	xVel = particle.velX < 0 ? -particle.velX : particle.velX;
																	if (xVel < physicsLiquidDirectionMomentumMax) {
																		particle.velX += physicsLiquidDirectionMomentum * physicsLiquidDirection;
																	}

																	// Remove the water particle
																	particleMap.delete(particleLiquid.gridIndex);
																	particles.remove(particleLiquid.node);
																	if (particlePool.length < settingsParticlePoolSize) {
																		// Recover the particle if the pool is low
																		particlePool.pushEndNode(particleLiquid.node);
																	}

																	physicsLiquidMoved = true;
																	break;
																}

																// Water collides with Lava
																if (particle.typeValue === SolidType.WATER && particleLiquid.typeValue === SolidType.LAVA) {
																	particleLiquid.typeValue = SolidType.ROCK;

																	// Half the time the water evaporates
																	if (randomNumbers[randomNumbersIndex++ % randomNumberLength] > 0.5 === true) {
																		particleMapUpdate = false;
																		particles.remove(particle.node);
																		if (particlePool.length < settingsParticlePoolSize) {
																			// Recover the particle if the pool is low
																			particlePool.pushEndNode(particle.node);
																		}
																		physicsLiquidMoved = true;
																		break;
																	}
																}

																// Next position not available in this direction
																break;
															} else if (gridData[gridIndex] !== 0) {
																// Next position not available in this direction
																break;
															} else {
																// Move Particle to new position
																collisionNextResultHardStop = false;
																particle.posX = xNext + (particle.posX % 1);
																particle.posY = yNext + (particle.posY % 1);

																xVel = particle.velX < 0 ? -particle.velX : particle.velX;
																if (xVel < physicsLiquidDirectionMomentumMax) {
																	particle.velX += physicsLiquidDirectionMomentum * physicsLiquidDirection;
																}

																physicsLiquidMoved = true;
																break;
															}
														}

														// Water was repositioned, exit the loop
														if (physicsLiquidMoved === true) {
															break;
														}
													}

													// Water was repositioned, exit the loop
													if (physicsLiquidMoved === true) {
														break;
													}
												}
											} else if (y < gridYLimit) {
												// Different-type redistribution
												// Random initial direction
												if (randomNumbers[randomNumbersIndex++ % randomNumberLength] > 0.5 === true) {
													physicsLiquidDirection = physicsLiquidDirections[0];
													physicsLiquidDirections[0] = physicsLiquidDirections[1];
													physicsLiquidDirections[1] = physicsLiquidDirection;
												}

												for (physicsLiquidDirection of physicsLiquidDirections) {
													xNext = x + physicsLiquidDirection;

													if (xNext !== 0 && xNext !== gridSideLength) {
														gridIndex = xNext * gridSideLength + y;

														// Check if the next position is a particle
														particleLiquid = particleMap.get(gridIndex);
														if (particleLiquid !== undefined) {
															// Check if the next same liquid position is stackable for redistribution
															if (particle.typeValue === particleLiquid.typeValue) {
																xNext += physicsLiquidDirection;
																gridIndex = xNext * gridSideLength + y;

																particleLiquid = particleMap.get(gridIndex);
																if (particleLiquid === undefined && gridData[gridIndex] === 0) {
																	// Move Particle to new position
																	collisionNextResultHardStop = false;
																	particle.posX += physicsLiquidDirection * 2;

																	xVel = particle.velX < 0 ? -particle.velX : particle.velX;
																	if (xVel < physicsLiquidDirectionMomentumMax) {
																		particle.velX += physicsLiquidDirectionMomentum * physicsLiquidDirection;
																	}

																	physicsLiquidMoved = true;
																}
															}

															break;
														} else if (gridData[gridIndex] === 0) {
															// Move Particle to new position
															collisionNextResultHardStop = false;
															particle.posX += physicsLiquidDirection;

															xVel = particle.velX < 0 ? -particle.velX : particle.velX;
															if (xVel < physicsLiquidDirectionMomentumMax) {
																particle.velX += physicsLiquidDirectionMomentum * physicsLiquidDirection;
															}

															physicsLiquidMoved = true;
															break;
														}
													}
												}
											}
										}
									}
								}
							} else if (particle.typeValue === SolidType.WEAPON) {
								console.log('COLLISION', 'WEAPON', particle.id);
								collisionWeapons.add(posXInteger * gridSideLength + posYInteger);
								particleMapUpdate = false;
								particles.remove(particle.node);
								if (particlePool.length < settingsParticlePoolSize) {
									// Recover the particle if the pool is low
									particlePool.pushEndNode(particle.node);
								}
							}

							// Calc: Hard Stop
							if (collisionNextResultHardStop === true) {
								// console.log('    >> HARD STOP', collisionX, collisionY);
								collisionNextResultHardStop = false;

								if (collisionX === true && collisionY === true) {
									particle.posX = posXInteger;
									particle.posY = posYInteger;
									particle.velX = 0;
									particle.velY = 0;

									posXIntegerNext = posXInteger;
									posYIntegerNext = posYInteger;
								} else if (collisionX === true) {
									particle.posX = posXInteger;
									particle.velX = 0;
									particle.velY *= physicsResistanceSecondary;

									posXIntegerNext = posXInteger;
								} else {
									particle.velX *= physicsResistanceSecondary;
									particle.posY = posYInteger;
									particle.velY = 0;

									posYIntegerNext = posYInteger;
								}
							}

							// Calc: Liquid Swap (swap liquid with solid as solid moves through the liquid)
							if (collisionNextResultLiquidSwap === true) {
								collisionNextResultLiquidSwap = false;
								physicsSplashes.push(((particle.posX | 0) << 16 ) | (particle.posY | 0));

								if (collisionNextParticle === undefined) {
									console.error('MainCalc > collision: Liquid swap failed');
								} else {
									// console.log(
									// 	'    >> LIQUID SWAP',
									// 	collisionX,
									// 	collisionY,
									// 	particle.posX | 0,
									// 	particle.posY | 0,
									// 	collisionNextParticle.posX | 0,
									// 	collisionNextParticle.posY | 0,
									// );

									// Mapping: Remove
									particleMap.delete(collisionNextParticle.gridIndex);

									// Position
									if (collisionX === true) {
										particle.posX = posXIntegerNext + (particle.posX % 1);
										collisionNextParticle.posX = posXInteger + (collisionNextParticle.posX % 1);

										particle.velX *= physicsResistanceLiquidSurfaceTensionX;
									}

									if (collisionY === true) {
										particle.posY = posYIntegerNext + (particle.posY % 1);
										collisionNextParticle.posY = posYInteger + (collisionNextParticle.posY % 1);
									}

									// Mapping: Set
									collisionNextParticle.gridIndex = posXInteger * gridSideLength + posYInteger;
									particleMap.set(collisionNextParticle.gridIndex, collisionNextParticle);

									// Surface Tension
									if (collisionY === true) {
										particleLiquid = particleMap.get(collisionNextParticle.gridIndex - 1);
										if (
											particleLiquid === undefined ||
											particleLiquid.type !== ParticleType.SOLID ||
											(particleLiquid.typeValue !== SolidType.LAVA && particleLiquid.typeValue !== SolidType.WATER)
										) {
											// Water column must be resting on the ground
											physicsLiquidAvailable = false;
											for (yNext = y + 1; yNext < gridYLimit; yNext++) {
												gridIndexEff = gridIndex + yNext;

												if (gridData[gridIndexEff] !== 0) {
													physicsLiquidAvailable = true;
													yNext--; // Offset to reference the last y value before reaching the ground
													break;
												} else if (particleMap.has(gridIndexEff) !== true) {
													break;
												}
											}

											if (physicsLiquidAvailable === true) {
												yVel = particle.velY < 0 ? -particle.velY : particle.velY;
												if (yVel > physicsResistanceLiquidLimitY) {
													particle.velY *= physicsResistanceLiquidSurfaceTensionY;
												}
											}
										}
									}
								}
							}

							// Calc: Final gridIndex
							particle.gridIndex = (particle.posX | 0) * gridSideLength + (particle.posY | 0);

							// Calc: Rounding Errors in Floating Point numbers
							xVel = particle.velX < 0 ? -particle.velX : particle.velX;
							if (xVel <= physicsVelocityMin) {
								particle.velX = 0;
							}
							yVel = particle.velY < 0 ? -particle.velY : particle.velY;
							if (yVel <= physicsVelocityMin) {
								particle.velY = 0;
							}

							// Calc: Brick It
							if (
								(particle.typeValue === SolidType.DIRT || particle.typeValue === SolidType.ROCK) &&
								collisionNextParticle === undefined && // make sure solids don't brick unless colliding with non-particles
								particle.velX === 0 &&
								particle.velY === 0
							) {
								// console.log('  >> BRICK IT', SolidType[particle.typeValue], particle.posX | 0, particle.posY | 0);
								gridData[particle.gridIndex] = (particle.health << worldEncodingShiftHealth) | particle.typeValue;
								gridUpdate = true;

								particleMapUpdate = false;
								particles.remove(particle.node);
								if (particlePool.length < settingsParticlePoolSize) {
									// Recover the particle if the pool is low
									particlePool.pushEndNode(particle.node);
								}
							}
						}
					}

					// Done
					if (particleMapUpdate === true) {
						particleMap.set(particle.gridIndex, particle);
					}
					if (particleNode.next !== undefined && particleNode.next.data.id === particleNode.data.id) {
						console.error('MainCalc: cyclical loop detected');
						particles.remove(particle.node);
						if (particlePool.length < settingsParticlePoolSize) {
							// Recover the particle if the pool is low
							particlePool.pushEndNode(particle.node);
						}
						break;
					}
					particleNode = particleNode.next;
				}

				// shot = shots.start;
				// while (shot !== undefined) {
				// 	shotComplete = true; // Just explode
				// 	shotData = shot.data;
				// 	shotTypeProperty = shotTypeProperties[shot.data.payload.type];
				// 	xPos = shotData.posXInteger;
				// 	yPos = shotData.posYInteger;

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

				// console.log('particleCount', particles.length, particlePool.length);

				// Output
				WorkerMainCalcEngine.post(
					[
						{
							cmd: WorkerMainCalcBusOutputCmd.STATS,
							data: {
								all: statAllRaw,
								particleCount: particles.length,
								particlePoolSize: particlePool.length,
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

				// Encode: Splashes
				if (physicsSplashes.length !== 0) {
					physicsSplashesEncoded = Uint32Array.from(physicsSplashes);
					buffers.push(physicsSplashesEncoded.buffer);

					physicsSplashes.length = 0;
				}else {
					physicsSplashesEncoded = undefined;
				}

				// Upload grid
				WorkerMainCalcEngine.post(
					[
						{
							cmd: WorkerMainCalcBusOutputCmd.DATA,
							data: {
								grid: gridClone,
								particles: particlesEncoded,
								splashes: physicsSplashesEncoded,
								worldSize: <WorldSize>gridSideLength,
							},
						},
					],
					buffers,
				);
			}
		};

		WorkerMainCalcEngine.animationFrameRequest = requestAnimationFrame(go);
	}
}
