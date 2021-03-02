import {CustomEventHandler} from '../event-handlers/custom-event-handler';
import {BaseAStream} from './base-a-stream';
import {SourceNode} from '../nodes/source-node';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamOptions {

}


export class AStream<Params extends any[], TResult> extends BaseAStream<Params, TResult, Params> {
    constructor(
        inputHandler?: SourceExecutor<Params, TResult>,
        options: AStreamOptions = {},
    ) {
        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        const eventHandler = new CustomEventHandler((args: Params) => inputHandler(...args));
        const sourceNode = new SourceNode({eventHandler});

        super({sourceNode: sourceNode, node: sourceNode});
    }
}
