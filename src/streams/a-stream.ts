import {BaseNode} from './base-node';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamOptions {

}


export class AStream<Params extends any[], TResult> extends BaseNode<Params, TResult, Params> {
    protected _inputHandler: SourceExecutor<Params, TResult>;
    private _nextSequenceId = 0;

    get _sourceStream(): AStream<Params, TResult> {
        return this;
    }

    constructor(
        inputHandler?: SourceExecutor<Params, TResult>,
        options: AStreamOptions = {},
    ) {
        super({});

        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        this._inputHandler = inputHandler;
    }

    async _runSource<TInitiatorResult>(args: Params, initiator: BaseNode<unknown, TInitiatorResult, Params>) {
        return this._runNode(Promise.resolve(args), initiator, this._nextSequenceId++)
    }

    async _handleFulfilledEvent(args: Params) : Promise<TResult> {
        return await this._inputHandler(...args);
    }
}
