import {BaseEventHandler, EventHandlerContext} from './base-event-handler';

export interface RejectedExecutor<TResult> {
    (reason: any): Promise<TResult> | TResult
}

export class ErrorEventHandler<T> extends BaseEventHandler<T, T> {
    constructor(
        protected _rejectedEventHandler: RejectedExecutor<T>,
    ) {
        super();
    }

    async handleRejectedEvent(reason, context: EventHandlerContext<T>): Promise<T> {
        return await this._rejectedEventHandler(reason);
    }
}
