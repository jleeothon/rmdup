import {dirname, basename, join} from 'path';
import {unlinkSync, lstatSync} from 'fs';
import {EventEmitter} from 'events';

import * as globby from 'globby';
import * as pMap from 'p-map';
import * as hasha from 'hasha';

export async function rmdups(
	listener: EventEmitter,
	{dir, recursive}: {dir: string, recursive: boolean}
) {
	const dirsPattern = join(dir, recursive ? '**' : '*');

	console.log(dirsPattern);
	let i = 0;
	const dirGlobOptions = {onlyDirectories: true};
	const dirs = await globby(dirsPattern, dirGlobOptions);
	const dirCount = dirs.length;
	await pMap(dirs, async (dirPath: string) => {
		listener.emit('enter-dir', {path: dirPath, index: i++, totalCount: dirCount});

		const dirFiles = await globby(join(dirPath), {onlyFiles: true});
		const fileInfos = await pMap(dirFiles, (f: string) => ({
			path: f,
			date: lstatSync(f).ctimeMs,
			hash: hasha.fromFileSync(f)
		}), {concurrency: 5});

		fileInfos.sort((a, b) => a.date - b.date);

		// Files to keep
		const goodFiles = new Map();
		fileInfos.forEach(info => {
			!goodFiles.has(info.hash) && goodFiles.set(info.hash, info);
		});

		fileInfos.forEach(info => {
			const goodFile = goodFiles.get(info.hash);
			if (goodFile.path === info.path) {
				return;
			}

			listener.emit('repeated-file', {path: info.path, originalPath: goodFile.path});
		});

		listener.emit('exit-dir', {path: dirPath});
	}, {concurrency: 2});
};

export class DebugEmitter extends EventEmitter {
	constructor() {
		super();
		this.on('enter-dir', (event: {path: string, index: number, totalCount: number}) => {
			const percent = (event.index / event.totalCount * 100).toFixed(2);
			console.log(`===> (${percent}%) "${event.path}"`);
		});
		this.on('repeated-file', (event: {path: string, originalPath: string}) => {
			const dirnameBoth = dirname(event.path);
			const basenameBad = basename(event.path);
			const basenameGood = basename(event.originalPath);
			console.log(`Delete "${dirnameBoth}"/{"${basenameBad}" < "${basenameGood}"}`);
		});
		this.on('exit-dir', (event: {path: string}) => {
			console.log(`<=== "${event.path}"`);
		});
	}
};

export class UnlinkEmitter extends DebugEmitter {
	constructor() {
		super();
		this.on('repeated-file', (event: {path: string}) => {
			unlinkSync(event.path);
		});
	}
};
