import fs from 'fs';
import { mkdir } from 'node:fs/promises';
import path from 'path';
import { ZipArchive } from 'archiver';

setTimeout(async () => {
	// Prep
	const __dirname = path.resolve(path.dirname(''));
	await mkdir(__dirname + '/dist', { recursive: true });

	// Config
	const archive = new ZipArchive({
			zlib: {
				level: 9, // Compression level
			},
		}),
		output = fs.createWriteStream(__dirname + '/dist/assets');

	// Listeners
	archive.on('error', function (err) {
		console.error('error', err);
		throw err;
	});
	archive.on('warning', function (err) {
		if (err.code === 'ENOENT') {
			// log warning
			console.warn('warning', err);
		} else {
			// throw error
			console.error('warning-err', err);
			throw err;
		}
	});

	// Done
	archive.pipe(output);
	archive.directory(__dirname + '/assets', false);
	archive.finalize();
});
