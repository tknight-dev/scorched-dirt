import packageJSON from '../../package.json' with { type: 'json' };

/**
 * @author tknight-dev
 */

export class ModuleDOM {
	public static canvases: HTMLCanvasElement[];
	public static elButtonEdit: HTMLElement;
	public static elButtonFullscreen: HTMLElement;
	public static elButtonMute: HTMLElement;
	public static elButtonPerformance: HTMLElement;
	public static elButtonPlay: HTMLElement;
	public static elError: HTMLElement;
	public static elGame: HTMLElement;
	public static elIconsBottom: HTMLElement;
	public static elIconsTop: HTMLElement;
	public static elLogo: HTMLElement;
	public static elMenu: HTMLElement;
	public static elMenuContent: HTMLElement;
	public static elMenuSettings: HTMLElement;
	public static elPerformance: HTMLElement;
	public static elPerformanceDirtCalc: HTMLElement;
	public static elPerformanceDirtCalcAll: HTMLElement;
	public static elPerformanceDirtWeaponCount: HTMLElement;
	public static elPerformanceDirtVideo: HTMLElement;
	public static elPerformanceDirtVideoAll: HTMLElement;
	public static elSettings: HTMLElement;
	public static elSettingsApply: HTMLElement;
	public static elSettingsCancel: HTMLElement;
	public static elSettingsSectionAudio: HTMLElement;
	public static elSettingsSectionAudioSelect: HTMLElement;
	public static elSettingsSectionGame: HTMLElement;
	public static elSettingsSectionGameSelect: HTMLElement;
	public static elSettingsSectionGraphics: HTMLElement;
	public static elSettingsSectionGraphicsSelect: HTMLElement;
	public static elSettingsValueAudioVolume: HTMLInputElement;
	public static elSettingsValueAudioVolumeReadout: HTMLInputElement;
	public static elSettingsValueAudioVolumeEffect: HTMLInputElement;
	public static elSettingsValueAudioVolumeEffectReadout: HTMLInputElement;
	public static elSettingsValueAudioVolumeMusic: HTMLInputElement;
	public static elSettingsValueAudioVolumeMusicReadout: HTMLInputElement;
	public static elSettingsValueGameDebug: HTMLInputElement;
	public static elSettingsValueGameEdgesWrap: HTMLInputElement;
	public static elSettingsValueGameWorldSize: HTMLInputElement;
	public static elSettingsValueGameWindRandomize: HTMLInputElement;
	public static elSettingsValueGameWindStrength: HTMLInputElement;
	public static elSettingsValueGraphicsAntialias: HTMLInputElement;
	public static elSettingsValueGraphicsDPI: HTMLInputElement;
	public static elSettingsValueGraphicsFPS: HTMLInputElement;
	public static elSettingsValueGraphicsFPSShow: HTMLInputElement;
	public static elSettingsValueGraphicsGamma: HTMLInputElement;
	public static elSettingsValueGraphicsGammaReadout: HTMLInputElement;
	public static elSettingsValueGraphicsGrayscale: HTMLInputElement;
	public static elSettingsValueGraphicsResolution: HTMLInputElement;
	public static elSpinner: HTMLElement;
	public static elStatFPS: HTMLElement;
	public static elVideo: HTMLElement;
	public static elVideoInteractive: HTMLElement;
	public static elVersion: HTMLAnchorElement;
	private static timeoutError: ReturnType<typeof setTimeout>;
	private static timeoutSpinner: ReturnType<typeof setTimeout>;

	public static async initialize(): Promise<void> {
		// General
		ModuleDOM.elError = <HTMLElement>document.getElementById('error');
		ModuleDOM.elGame = <HTMLElement>document.getElementById('game');
		ModuleDOM.elLogo = <HTMLElement>document.getElementById('logo');
		ModuleDOM.elSpinner = <HTMLElement>document.getElementById('spinner');
		ModuleDOM.elStatFPS = <HTMLElement>document.getElementById('stat-fps');
		ModuleDOM.elVideo = <HTMLElement>document.getElementById('video');
		ModuleDOM.elVideoInteractive = <HTMLElement>document.getElementById('video-interactive');
		ModuleDOM.elVersion = <HTMLAnchorElement>document.getElementById('version');

		// Icons
		ModuleDOM.elButtonEdit = <HTMLElement>document.getElementById('button-edit');
		ModuleDOM.elButtonFullscreen = <HTMLElement>document.getElementById('button-fullscreen');
		ModuleDOM.elButtonMute = <HTMLElement>document.getElementById('button-mute');
		ModuleDOM.elButtonPerformance = <HTMLElement>document.getElementById('button-performance');
		ModuleDOM.elButtonPlay = <HTMLElement>document.getElementById('button-play');
		ModuleDOM.elIconsBottom = <HTMLElement>document.getElementById('icons-bottom');
		ModuleDOM.elIconsTop = <HTMLElement>document.getElementById('icons-top');

		// Menu
		ModuleDOM.elMenu = <HTMLElement>document.getElementById('menu');
		ModuleDOM.elMenuContent = <HTMLElement>document.getElementById('menu-content');
		ModuleDOM.elMenuSettings = <HTMLElement>document.getElementById('menu-settings');
		ModuleDOM.elMenu.onclick = () => {
			ModuleDOM.elLogo.classList.toggle('open');
			ModuleDOM.elMenuContent.classList.toggle('open');
		};
		document.addEventListener('click', (event: any) => {
			if (event.target.id !== ModuleDOM.elMenu.id) {
				ModuleDOM.elLogo.classList.remove('open');
				ModuleDOM.elMenuContent.classList.remove('open');
			}
		});

		// Performance
		ModuleDOM.elPerformance = <HTMLElement>document.getElementById('performance');
		ModuleDOM.elPerformanceDirtCalc = <HTMLElement>document.getElementById('performance-dirt-calc');
		ModuleDOM.elPerformanceDirtCalcAll = <HTMLElement>document.getElementById('performance-dirt-calc-all');
		ModuleDOM.elPerformanceDirtWeaponCount = <HTMLElement>document.getElementById('performance-dirt-calc-weapon-count');
		ModuleDOM.elPerformanceDirtVideo = <HTMLElement>document.getElementById('performance-dirt-video');
		ModuleDOM.elPerformanceDirtVideoAll = <HTMLElement>document.getElementById('performance-dirt-video-all');

		// Settings: Menu
		ModuleDOM.elSettings = <HTMLElement>document.getElementById('settings');
		ModuleDOM.elSettingsApply = <HTMLElement>document.getElementById('settings-apply');
		ModuleDOM.elSettingsCancel = <HTMLElement>document.getElementById('settings-cancel');
		ModuleDOM.elSettingsCancel.onclick = () => {
			ModuleDOM.elSettings.style.display = 'none';
		};
		ModuleDOM.elSettingsSectionAudio = <HTMLElement>document.getElementById('settings-section-audio');
		ModuleDOM.elSettingsSectionAudioSelect = <HTMLElement>document.getElementById('settings-section-audio-select');
		ModuleDOM.elSettingsSectionAudioSelect.onclick = () => {
			// Sections
			ModuleDOM.elSettingsSectionAudio.style.display = 'block';
			ModuleDOM.elSettingsSectionGame.style.display = 'none';
			ModuleDOM.elSettingsSectionGraphics.style.display = 'none';

			// Selects
			ModuleDOM.elSettingsSectionAudioSelect.classList.add('active');
			ModuleDOM.elSettingsSectionGameSelect.classList.remove('active');
			ModuleDOM.elSettingsSectionGraphicsSelect.classList.remove('active');
		};

		ModuleDOM.elSettingsSectionGame = <HTMLElement>document.getElementById('settings-section-game');
		ModuleDOM.elSettingsSectionGameSelect = <HTMLElement>document.getElementById('settings-section-game-select');
		ModuleDOM.elSettingsSectionGameSelect.onclick = () => {
			// Sections
			ModuleDOM.elSettingsSectionAudio.style.display = 'none';
			ModuleDOM.elSettingsSectionGame.style.display = 'block';
			ModuleDOM.elSettingsSectionGraphics.style.display = 'none';

			// Selects
			ModuleDOM.elSettingsSectionAudioSelect.classList.remove('active');
			ModuleDOM.elSettingsSectionGameSelect.classList.add('active');
			ModuleDOM.elSettingsSectionGraphicsSelect.classList.remove('active');
		};

		ModuleDOM.elSettingsSectionGraphics = <HTMLElement>document.getElementById('settings-section-graphics');
		ModuleDOM.elSettingsSectionGraphicsSelect = <HTMLElement>document.getElementById('settings-section-graphics-select');
		ModuleDOM.elSettingsSectionGraphicsSelect.onclick = () => {
			// Sections
			ModuleDOM.elSettingsSectionAudio.style.display = 'none';
			ModuleDOM.elSettingsSectionGame.style.display = 'none';
			ModuleDOM.elSettingsSectionGraphics.style.display = 'block';

			// Selects
			ModuleDOM.elSettingsSectionAudioSelect.classList.remove('active');
			ModuleDOM.elSettingsSectionGameSelect.classList.remove('active');
			ModuleDOM.elSettingsSectionGraphicsSelect.classList.add('active');
		};

		// Settings: Values - Audio
		ModuleDOM.elSettingsValueAudioVolume = <HTMLInputElement>document.getElementById('settings-value-audio-volume');
		ModuleDOM.elSettingsValueAudioVolumeReadout = <HTMLInputElement>document.getElementById('settings-value-audio-volume-readout');

		ModuleDOM.elSettingsValueAudioVolumeEffect = <HTMLInputElement>document.getElementById('settings-value-audio-volume-effect');
		ModuleDOM.elSettingsValueAudioVolumeEffectReadout = <HTMLInputElement>document.getElementById('settings-value-audio-volume-effect-readout');

		ModuleDOM.elSettingsValueAudioVolumeMusic = <HTMLInputElement>document.getElementById('settings-value-audio-volume-music');
		ModuleDOM.elSettingsValueAudioVolumeMusicReadout = <HTMLInputElement>document.getElementById('settings-value-audio-volume-music-readout');

		// Settings: Values - Game
		ModuleDOM.elSettingsValueGameDebug = <HTMLInputElement>document.getElementById('settings-value-game-debug');
		ModuleDOM.elSettingsValueGameEdgesWrap = <HTMLInputElement>document.getElementById('settings-value-game-edges-wrap');
		ModuleDOM.elSettingsValueGameWorldSize = <HTMLInputElement>document.getElementById('settings-value-world-size');
		ModuleDOM.elSettingsValueGameWindRandomize = <HTMLInputElement>document.getElementById('settings-value-wind-randomize');
		ModuleDOM.elSettingsValueGameWindStrength = <HTMLInputElement>document.getElementById('settings-value-wind-strength');

		// Settings: Values - Graphics
		ModuleDOM.elSettingsValueGraphicsAntialias = <HTMLInputElement>document.getElementById('settings-value-graphics-antialias');
		ModuleDOM.elSettingsValueGraphicsDPI = <HTMLInputElement>document.getElementById('settings-value-graphics-dpi');

		ModuleDOM.elSettingsValueGraphicsFPS = <HTMLInputElement>document.getElementById('settings-value-graphics-fps');
		ModuleDOM.elSettingsValueGraphicsFPSShow = <HTMLInputElement>document.getElementById('settings-value-graphics-fps-show');

		ModuleDOM.elSettingsValueGraphicsGamma = <HTMLInputElement>document.getElementById('settings-value-graphics-gamma');
		ModuleDOM.elSettingsValueGraphicsGamma.oninput = () => {
			ModuleDOM.elSettingsValueGraphicsGammaReadout.value = ModuleDOM.elSettingsValueGraphicsGamma.value + '%';
		};
		ModuleDOM.elSettingsValueGraphicsGammaReadout = <HTMLInputElement>document.getElementById('settings-value-graphics-gamma-readout');

		ModuleDOM.elSettingsValueGraphicsGrayscale = <HTMLInputElement>document.getElementById('settings-value-graphics-grayscale');
		ModuleDOM.elSettingsValueGraphicsResolution = <HTMLInputElement>document.getElementById('settings-value-graphics-resolution');

		// Done
		ModuleDOM.elVersion.innerText = packageJSON.version;
	}

	public static error() {
		ModuleDOM.elError.style.display = 'flex';
		setTimeout(() => {
			ModuleDOM.elError.classList.add('show');

			clearTimeout(ModuleDOM.timeoutError);
			ModuleDOM.timeoutError = setTimeout(() => {
				ModuleDOM.elError.classList.remove('show');

				ModuleDOM.timeoutError = setTimeout(() => {
					ModuleDOM.elError.style.display = 'none';
				}, 1000);
			}, 3000);

			ModuleDOM.spinner(false);
		}, 10);
	}

	public static spinner(enable: boolean): void {
		clearTimeout(ModuleDOM.timeoutSpinner);

		if (enable === true) {
			ModuleDOM.timeoutSpinner = setTimeout(() => {
				if (ModuleDOM.elSpinner.style.display !== 'flex') {
					ModuleDOM.elSpinner.classList.remove('show');
					ModuleDOM.elSpinner.style.display = 'flex';

					ModuleDOM.timeoutSpinner = setTimeout(() => {
						ModuleDOM.elSpinner.classList.add('show');
					}, 10);
				} else {
					ModuleDOM.elSpinner.classList.add('show');
				}
			}, 10);
		} else {
			ModuleDOM.timeoutSpinner = setTimeout(() => {
				ModuleDOM.elSpinner.classList.remove('show');

				ModuleDOM.timeoutSpinner = setTimeout(() => {
					ModuleDOM.elSpinner.style.display = 'none';
				}, 1000);
			}, 10);
		}
	}
}
