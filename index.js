const {dirname, basename, join} = require('path');
const {unlinkSync, lstatSync} = require('fs');
const {EventEmitter} = require('events');
const globby = require('globby');
const pMap = require('p-map');
const hasha = require('hasha');

export async function rmdup(emitter, {dir, recursive}) {
	const dirsPattern = join(dir, recursive ? '**' : '*');

	let i = 0;
	const dirGlobOptions = {onlyDirectories: true};
	const dirs = await globby(dirsPattern, dirGlobOptions);
	const dirCount = dirs.length;
	await pMap(dirs, async dirPath => {
		emitter.emit('enter-dir', {path: dirPath, index: i++, totalCount: dirCount});

		const dirFiles = await globby(join(dirPath), {onlyFiles: true});
		const fileInfos = await pMap(dirFiles, f => ({
			path: f,
			date: lstatSync(f).ctimeMs,
			hash: hasha.fromFileSync(f)
		}), {concurrency: 5});

		fileInfos.sort((a, b) => a.date - b.date);

		// Files to keep
		const goodFiles = new Map();
		fileInfos.forEach(info => {
			if (!goodFiles.has(info.hash)) {
				goodFiles.set(info.hash, info);
			}
		});

		fileInfos.forEach(info => {
			const goodFile = goodFiles.get(info.hash);
			if (goodFile.path === info.path) {
				return;
			}

			emitter.emit('repeated-file', {path: info.path, originalPath: goodFile.path});
		});

		emitter.emit('exit-dir', {path: dirPath});
	}, {concurrency: 2});
}

export class DebugEmitter extends EventEmitter {
	constructor() {
		super();
		this.on('enter-dir', event => {
			const percent = (event.index / event.totalCount * 100).toFixed(2);
			console.log(`===> (${percent}%) "${event.path}"`);
		});
		this.on('repeated-file', event => {
			const dirnameBoth = dirname(event.path);
			const basenameBad = basename(event.path);
			const basenameGood = basename(event.originalPath);
			console.log(`Delete "${dirnameBoth}"/{"${basenameBad}" < "${basenameGood}"}`);
		});
		this.on('exit-dir', event => {
			console.log(`<=== "${event.path}"`);
		});
	}
}

export class UnlinkEmitter extends DebugEmitter {
	constructor() {
		super();
		this.on('repeated-file', event => {
			unlinkSync(event.path);
		});
	}
}
