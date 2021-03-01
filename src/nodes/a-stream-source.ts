import {CustomEventHandler} from '../event-handlers/custom-event-handler';
import {AStreamNode} from './a-stream-node';
import {SourceNodeInternals} from './source-node-internals';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamOptions {

}


export class AStreamSource<Params extends any[], TResult> extends AStreamNode<Params, TResult, Params> {
    constructor(
        inputHandler?: SourceExecutor<Params, TResult>,
        options: AStreamOptions = {},
    ) {
        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        const eventHandler = new CustomEventHandler((args: Params) => inputHandler(...args));
        const sourceNodeInternals = new SourceNodeInternals({eventHandler});

        super({sourceNodeInternals, nodeInternals: sourceNodeInternals});
    }
}
