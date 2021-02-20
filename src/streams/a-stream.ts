import {BaseNode} from './base-node';
import {CustomEventHandler} from '../event-handlers/custom-event-handler';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamOptions {

}


export class AStream<Params extends any[], TResult> extends BaseNode<Params, TResult, Params> {
    private _nextSequenceId;

    get _sourceStream(): AStream<Params, TResult> {
        return this;
    }

    constructor(
        inputHandler?: SourceExecutor<Params, TResult>,
        options: AStreamOptions = {},
    ) {
        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        const eventHandler = new CustomEventHandler((args: Params) => inputHandler(...args));

        super({eventHandler});

        this._nextSequenceId = 0;
    }

    async _runSource<TInitiatorResult>(args: Params, initiator: BaseNode<unknown, TInitiatorResult, Params>) {
        return this._runNode(Promise.resolve(args), initiator, this._nextSequenceId++)
    }
}
