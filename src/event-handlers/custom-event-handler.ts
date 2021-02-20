import {BaseNode} from '../streams/base-node';
import {BaseEventHandler} from './base-event-handler';

export interface Executor<T, TResult> {
    (value: T): Promise<TResult> | TResult
}

declare module '../streams/base-node' {
    export interface BaseNode<T, TResult, SourceParams extends any[]> {
        next<TChildResult>(
            fulfilledEventHandler: Executor<TResult, TChildResult>
        ): BaseNode<TResult, TChildResult, SourceParams>;
    }
}

BaseNode.prototype.next = function next<TChildResult, T, TResult, SourceParams extends any[]>(
    this: BaseNode<T, TResult, SourceParams>,
    fulfilledEventHandler: Executor<TResult, TChildResult>
): BaseNode<TResult, TChildResult, SourceParams> {
    const customEventHandler = new CustomEventHandler<TResult, TChildResult>(fulfilledEventHandler);
    return this.addChild(customEventHandler);
};

export class CustomEventHandler<T, TResult> extends BaseEventHandler<T, TResult> {
    protected _inputHandler: Executor<T, TResult>;

    constructor(
        inputHandler: Executor<T, TResult>,
    ) {
        super();

        this._inputHandler = inputHandler;
    }

    async handleFulfilledEvent(value: T, sequenceId: number): Promise<TResult> {
        return await this._inputHandler(value);
    }
}
