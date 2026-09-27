import { AssetManager } from '../gaming-canvas/modules/asset-manager-node/asset-manager.js';
import { AssetManagerManifest, AssetManagerManifestInstance } from '../gaming-canvas/modules/asset-manager-node/models.js';

/**
 * @author tknight-dev
 */

enum AssetCategory {
	AUDIO_EFFECT,
	AUDIO_MUSIC,
}

export class ModuleAssets {
	private static manifest: AssetManagerManifest;

	public static async initialize(): Promise<void> {
		// Configure
		ModuleAssets.manifest = {
			assets: new Map(),
		};
		AssetManager.setManifest(ModuleAssets.manifest);

		// Populate
		ModuleAssets.manifestAudio();
		ModuleAssets.manifestImage();

		// Test
		// console.log('data', await AssetManager.extract());
	}

	public static manifestAudio(): void {
		let assetsAudioEffect: Map<string, AssetManagerManifestInstance> = new Map(),
			assetsAudioMusic: Map<string, AssetManagerManifestInstance> = new Map(),
			manifest: AssetManagerManifest = ModuleAssets.manifest;

		// Configure
		manifest.assets.set(AssetCategory.AUDIO_EFFECT, assetsAudioEffect);
		manifest.assets.set(AssetCategory.AUDIO_MUSIC, assetsAudioMusic);

		// Instances
		assetsAudioEffect.set('audio/effect/water1.mp3', {
			mimeType: 'audio/mp3',
		});
		assetsAudioEffect.set('audio/effect/water2.mp3', {
			mimeType: 'audio/mp3',
		});
		assetsAudioEffect.set('audio/effect/water3.mp3', {
			mimeType: 'audio/mp3',
		});
	}

	public static manifestImage(): void {
		let manifest: AssetManagerManifest = ModuleAssets.manifest;
	}
}
