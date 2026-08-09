import esbuild from 'esbuild';
import open from 'open';
import { sassPlugin } from 'esbuild-sass-plugin';
import { typecheckPlugin } from '@jgoz/esbuild-plugin-typecheck';

/**
 * @author tknight-dev
 */

/**
 * ARGs
 */
var production = true;
for (const param of process.argv) {
	if (param === 'dev') {
		production = false;
	}
}

/**
 * Config
 */
var config = {
	bundle: true,
	entryPoints: {
		favicon: 'src/favicon.ico',
		index: 'src/index.html',
		style: 'src/style.scss',
		script: 'src/script.ts',
		'main-calc.engine': 'src/workers/main-calc/main-calc.engine.ts', // Worker entry point
		'main-video.engine': 'src/workers/main-video/main-video.engine.ts', // Worker entry point
		// 'video-editor.engine': 'src/workers/video-editor/video-editor.engine.ts', // Worker entry point
		// 'video-main.engine': 'src/workers/video-main/video-main.engine.ts', // Worker entry point
		// 'video-overlay.engine': 'src/workers/video-overlay/video-overlay.engine.ts', // Worker entry point
	},
	loader: {
		'.html': 'copy',
		'.ico': 'copy',
		'.svg': 'file',
	},
	format: 'esm',
	metafile: true,
	minify: true,
	outdir: 'dist',
	outExtension: {
		'.js': '.mjs',
	},
	platform: 'node',
	plugins: [], // Don't set plugins here
	sourcemap: false,
};

/**
 * Build
 */
if (production) {
	// Config: prod
	config.plugins = [sassPlugin()];

	await esbuild.build(config);
} else {
	var host = '0.0.0.0',
		port = 8080;

	// Config: dev
	config.minify = false;
	config.plugins = [
		sassPlugin({
			watch: true,
		}),
		typecheckPlugin({
			watch: true,
		}),
	];
	config.sourcemap = true;

	// Serve and Watch
	var ctx = await esbuild.context(config);
	await ctx.watch();
	await ctx.serve({
		host: host,
		port: port,
		servedir: 'dist',
	});

	// Report and open Browser instance
	console.log(`Watching and Serving on http://${host}:${port}`);
	open(`http://${host}:${port}`);
}
