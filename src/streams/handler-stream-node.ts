import {BaseStreamNode, BaseStreamOptions} from './base-stream-node';

export interface Executor<T, TResult> {
    (value: T): Promise<TResult> | TResult
}

declare module './base-stream-node' {
    export interface BaseStreamNode<T, TResult, SourceParams extends any[]> {
        next<NextT>(
            fulfilledEventHandler: Executor<TResult, NextT>
        ): HandlerStreamNode<T, NextT, SourceParams>;
    }
}

BaseStreamNode.prototype.next = function next<NextT, T, TResult, SourceParams extends any[]>(
    this: BaseStreamNode<T, TResult, SourceParams>,
    fulfilledEventHandler: Executor<TResult, NextT>
): HandlerStreamNode<TResult, NextT, SourceParams> {
    const nextStream = new HandlerStreamNode<TResult, NextT, SourceParams>(fulfilledEventHandler, {
        parentStream: this
    });
    this._nextStreams.push(nextStream);

    return nextStream;
};

export interface HandlerStreamOptions<T, SourceParams extends any[]> extends BaseStreamOptions<T, SourceParams> {

}


export class HandlerStreamNode<T, TResult, SourceParams extends any[]> extends BaseStreamNode<T, TResult, SourceParams> {
    protected _inputHandler: Executor<T, TResult>;

    constructor(
        inputHandler?: Executor<T, TResult>,
        options: HandlerStreamOptions<T, SourceParams> = {},
    ) {
        super(options);

        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        this._inputHandler = inputHandler;
    }

    async _handleFulfilledEvent(value: T) : Promise<TResult> {
        return await this._inputHandler(value);
    }
}
