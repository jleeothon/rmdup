import {program} from 'commander';
import {rmdups, DebugEmitter, UnlinkEmitter} from './rmdups';

program
	.requiredOption('-D, --dir <dir>', 'Directory to inspect')
	.option('-r, --recursive', 'Also check child directories (but deletion only in same directory)')
	.option('-d, --debug', 'Only print information, do not delete')
	.option('-s, --suffix <suffix>', 'Suffix of filenames to check (e.g. ".jpg")')
	.option('--concurrency-dir', 'Maximum amount of directories to check at once')
	.option('--concurrency-hash', 'Only print information, do not delete');

program.parse(process.argv);

const listener = program.debug ? new DebugEmitter() : new UnlinkEmitter();
const opts = {
	dir: program.dir,
	recursive: program.recursive,
};

rmdups(listener, opts);
