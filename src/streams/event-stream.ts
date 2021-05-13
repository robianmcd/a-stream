import {CustomEventHandler} from '../event-handlers/custom-event-handler';
import {SourceNode} from '../nodes/source-node';
import {StandaloneInputConnectionMgr} from '../nodes/standalone-input-connection-mgr';
import type {NodeOptions} from '../nodes/node';
import {BaseStateStream} from './base-state-stream';
import {AStreamConstructorOptions, AStreamOptions, DefaultAStreamOptions} from './base-a-stream';

export class EventStream<Params extends any[], TResult> extends BaseStateStream<Params, TResult, Params> {
    constructor(
        inputHandler?: (...args: Params) => Promise<TResult> | TResult,
        options: AStreamConstructorOptions<TResult> = {},
    ) {
        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        let nodeOptions: NodeOptions<TResult> = <any>{};
        let streamOptions: AStreamOptions = <any>{};
        for (const [key, value] of Object.entries(options)) {
            if (DefaultAStreamOptions.hasOwnProperty(key)) {
                streamOptions[key] = value;
                streamOptions[key] ??= DefaultAStreamOptions[key];
            } else {
                nodeOptions[key] = value;
            }
        }

        const eventHandler = new CustomEventHandler((args: Params) => inputHandler(...args));
        const inputConnectionMgr = new StandaloneInputConnectionMgr();
        const sourceNode = new SourceNode(eventHandler, inputConnectionMgr, () => this, nodeOptions, streamOptions);

        super(sourceNode, sourceNode);
    }
}
