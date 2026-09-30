import { GamingCanvas } from '../gaming-canvas/main/gaming-canvas.js';
import { AssetManager } from '../gaming-canvas/modules/asset-manager-node/asset-manager.js';
import { AssetManagerManifest, AssetManagerManifestInstance } from '../gaming-canvas/modules/asset-manager-node/models.js';

/**
 * @author tknight-dev
 */

export enum AssetCategory {
	AUDIO_EFFECT = 0,
	AUDIO_MUSIC = 1,
}

export enum AssetCategoryEffect {
	WATER_SPLASH_01 = 0,
	WATER_SPLASH_02 = 1,
}

export interface AssetManagerManifestInstanceAudio extends AssetManagerManifestInstance {
	volume: number;
}

export class ModuleAssets {
	private static manifest: AssetManagerManifest;

	public static async initialize(): Promise<void> {
		// Configure
		ModuleAssets.manifest = {
			assets: new Map(),
		};

		// Populate
		ModuleAssets.manifestAudio();
		ModuleAssets.manifestImage();

		// Done
		AssetManager.setManifest(ModuleAssets.manifest);
	}

	public static async initializeAudio(): Promise<void> {
		const audioData: Map<number, Blob | ImageBitmap | string> | void = await AssetManager.extract({
			categories: new Set([AssetCategory.AUDIO_EFFECT, AssetCategory.AUDIO_MUSIC]),
		});
		if (audioData === undefined) {
			console.error(`ModuleAssets: failed to extract audio`);
		} else {
			await GamingCanvas.audioLoad(<Map<number, string>>audioData);
		}
	}

	public static getManifestInstanceById(assetId: number, category: number): AssetManagerManifestInstance | undefined {
		return AssetManager.getManifestInstanceById(assetId, category);
	}

	public static manifestAudio(): void {
		let assetsAudioEffect: Map<string, AssetManagerManifestInstance> = new Map(),
			assetsAudioMusic: Map<string, AssetManagerManifestInstance> = new Map(),
			manifest: AssetManagerManifest = ModuleAssets.manifest;

		// Configure
		manifest.assets.set(AssetCategory.AUDIO_EFFECT, assetsAudioEffect);
		manifest.assets.set(AssetCategory.AUDIO_MUSIC, assetsAudioMusic);

		// Instances
		assetsAudioEffect.set('audio/effect/water_splash_01.mp3', <AssetManagerManifestInstanceAudio>{
			author: 'roboroo',
			id: AssetCategoryEffect.WATER_SPLASH_01,
			license: 'Creative Commons 0',
			mimeType: 'audio/mp3',
			url: 'https://freesound.org/people/roboroo/sounds/436792',
			volume: 0.1,
		});
		assetsAudioEffect.set('audio/effect/water_splash_02.mp3', <AssetManagerManifestInstanceAudio>{
			author: 'qubodup',
			id: AssetCategoryEffect.WATER_SPLASH_02,
			license: 'Creative Commons 0',
			mimeType: 'audio/mp3',
			url: 'https://freesound.org/people/qubodup/sounds/212143',
			volume: 0.1,
		});
	}

	public static manifestImage(): void {
		let manifest: AssetManagerManifest = ModuleAssets.manifest;
	}
}
