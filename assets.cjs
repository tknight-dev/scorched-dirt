const archiver = require('archiver');
const { mkdir } = require('node:fs/promises');
const fs = require('fs');

setTimeout(async () => {
	// create a file to stream archive data to.
	await mkdir(__dirname + '/dist', { recursive: true });
	const archive = archiver('zip', {
		zlib: { level: 9 }, // Sets the compression level.
	});

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

	archive.pipe(fs.createWriteStream(__dirname + '/dist/assets'));
	archive.directory(__dirname + '/assets', false);
	archive.finalize();
});
