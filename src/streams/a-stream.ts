import {BaseStreamNode} from './base-stream-node';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamOptions {

}


export class AStream<Params extends any[], TResult> extends BaseStreamNode<Params, TResult, Params> {
    protected _inputHandler: SourceExecutor<Params, TResult>;

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

    async _handleFulfilledEvent(args: Params) : Promise<TResult> {
        return await this._inputHandler(...args);
    }
}
