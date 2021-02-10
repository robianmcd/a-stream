import {BaseNode} from './base-node';
import {ChildNode, ChildNodeOptions} from './child-node';

export interface Executor<T, TResult> {
    (value: T): Promise<TResult> | TResult
}

declare module './base-node' {
    export interface BaseNode<T, TResult, SourceParams extends any[]> {
        next<NextT>(
            fulfilledEventHandler: Executor<TResult, NextT>
        ): HandlerNode<T, NextT, SourceParams>;
    }
}

BaseNode.prototype.next = function next<NextT, T, TResult, SourceParams extends any[]>(
    this: BaseNode<T, TResult, SourceParams>,
    fulfilledEventHandler: Executor<TResult, NextT>
): HandlerNode<TResult, NextT, SourceParams> {
    const nextStream = new HandlerNode<TResult, NextT, SourceParams>(fulfilledEventHandler, {
        parentStream: this
    });
    this._nextStreams.push(nextStream);

    return nextStream;
};

export interface HandlerStreamOptions<T, SourceParams extends any[]> extends ChildNodeOptions<T, SourceParams> {

}


export class HandlerNode<T, TResult, SourceParams extends any[]> extends ChildNode<T, TResult, SourceParams> {
    protected _inputHandler: Executor<T, TResult>;

    constructor(
        inputHandler: Executor<T, TResult>,
        options: HandlerStreamOptions<T, SourceParams>,
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
