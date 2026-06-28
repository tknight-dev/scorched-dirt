import { ModuleDOM } from './modules/dom.js';
import { ModuleSettings } from './modules/settings.js';
/**
 * @author tknight-dev
 */

// ESBuild live reloader
new EventSource('/esbuild').addEventListener('change', () => location.reload());

class ScorchedDirt {
	public static readonly localStoragePrefix: string = 'TKNIGHT_DEV__SCORCHED_DIRT__';

	private static async initialize(): Promise<void> {
		// DOM
		ModuleDOM.elMenuSettings.onclick = () => {
			ModuleDOM.spinner(true);

			// DOM
			ModuleDOM.elLogo.classList.remove('open');
			ModuleDOM.elMenuContent.classList.remove('open');
			ModuleDOM.elSettingsSectionGameSelect.click();

			// Game
			// Pause

			// Settings
			ModuleSettings.domUpdate();

			// Done
			ModuleDOM.elSettings.style.display = 'block';
			ModuleDOM.spinner(false);
		};
		ModuleDOM.elSettingsApply.onclick = () => {
			ModuleDOM.spinner(true);

			// Settings
			ModuleSettings.domParse();
			ModuleSettings.save();

			// Done
			ModuleDOM.elSettings.style.display = 'none';
			ModuleDOM.spinner(false);
		};
	}

	public static async main(): Promise<void> {
		// Initialize: Base
		await ModuleDOM.initialize();
		await ModuleSettings.initialize(ScorchedDirt.localStoragePrefix);

		// Initialize: Abstractions
		await ScorchedDirt.initialize();
	}
}
ScorchedDirt.main();
