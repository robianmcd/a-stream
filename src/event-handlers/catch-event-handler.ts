import {BaseEventHandler, EventHandlerContext} from './base-event-handler';

export interface RejectedExecutor<TResult> {
    (reason: any): Promise<TResult> | TResult
}

export class CatchEventHandler<T> extends BaseEventHandler<T, T> {
    protected _rejectedEventHandler: (value: any) => Promise<T> | T;

    constructor(
        rejectedEventHandler: RejectedExecutor<T>,
    ) {
        super();

        this._rejectedEventHandler = rejectedEventHandler;
    }

    async handleRejectedEvent(reason, context: EventHandlerContext<T>): Promise<T> {
        return await this._rejectedEventHandler(reason);
    }
}
