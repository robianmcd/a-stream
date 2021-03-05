import {CustomEventHandler} from '../event-handlers/custom-event-handler';
import {BaseAStream} from './base-a-stream';
import {SourceNode} from '../nodes/source-node';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamConstructorOptions {
    ignoreParentInitialState?: boolean
}

export type AStreamOptions = Required<AStreamConstructorOptions>;

const DEFAULT_A_STREAM_OPTIONS: AStreamOptions = {
    ignoreParentInitialState: false
};

export class AStream<Params extends any[], TResult> extends BaseAStream<Params, TResult, Params> {
    constructor(
        inputHandler?: SourceExecutor<Params, TResult>,
        options: AStreamConstructorOptions = {},
    ) {
        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        const defaultedOptions = Object.assign({}, DEFAULT_A_STREAM_OPTIONS, options);

        const eventHandler = new CustomEventHandler((args: Params) => inputHandler(...args));
        const sourceNode = new SourceNode(eventHandler, defaultedOptions);

        super(sourceNode, sourceNode);
    }
}
