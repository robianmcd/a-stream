import {BaseEventHandler, EventHandlerContext} from './base-event-handler';

export interface RejectedExecutor<TResult, TStreamNode> {
    (reason: any, context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> | TResult
}

export class ErrorEventHandler<T, TStreamNode> extends BaseEventHandler<T, T, TStreamNode> {
    constructor(
        protected _rejectedEventHandler: RejectedExecutor<T, TStreamNode>,
    ) {
        super();
    }

    async handleRejectedEvent(reason, context: EventHandlerContext<T, TStreamNode>): Promise<T> {
        return await this._rejectedEventHandler(reason, context);
    }
}
