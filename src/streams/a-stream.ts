import {CustomEventHandler} from '../event-handlers/custom-event-handler';
import {BaseAStream} from './base-a-stream';
import {SourceNode} from '../nodes/source-node';
import {StandaloneInputConnectionMgr} from '../nodes/standalone-input-connection-mgr';
import type {NodeOptions} from '../nodes/node';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

//Placeholder for when there are stream options shared by all nodes or any options taken by `new AStream(handler, options)` that are not taken by node.addChild(options)
const DefaultAStreamOptions = Object.freeze({
});

export type AStreamOptions = typeof DefaultAStreamOptions;

export type AStreamConstructorOptions<TResult> = Omit<NodeOptions<TResult>, 'terminateInputEvents'> | AStreamOptions;


export class AStream<Params extends any[], TResult> extends BaseAStream<Params, TResult, Params> {
    constructor(
        inputHandler?: SourceExecutor<Params, TResult>,
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
