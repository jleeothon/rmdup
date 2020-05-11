import {EventEmitter} from 'events';

export declare function rmdups(
	emitter: EventEmitter,
	{dir, recursive}: {dir: string; recursive: boolean}
): Promise<void>;

export declare class DebugEmitter extends EventEmitter {
	constructor();
}

export declare class UnlinkEmitter extends DebugEmitter {
	constructor();
}
