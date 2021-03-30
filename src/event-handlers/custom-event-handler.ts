import {BaseEventHandler, EventHandlerContext} from './base-event-handler';

export interface Executor<T, TResult, TStreamNode> {
    (value: T, context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> | TResult
}

export class CustomEventHandler<T, TResult, TStreamNode> extends BaseEventHandler<T, TResult, TStreamNode> {
    protected _inputHandler: Executor<T, TResult, TStreamNode>;

    constructor(
        inputHandler: Executor<T, TResult, TStreamNode>,
    ) {
        super();

        this._inputHandler = inputHandler;
    }

    async handleFulfilledEvent(value: T, context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> {
        return await this._inputHandler(value, context);
    }
}
