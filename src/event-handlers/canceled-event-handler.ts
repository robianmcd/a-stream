import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {CanceledAStreamEvent} from '../errors/canceled-a-stream-event';

export type CanceledEventExecutor<TResult> = (aStreamError: CanceledAStreamEvent) => Promise<TResult> | TResult;

export class CanceledEventHandler<T> extends BaseEventHandler<T, T> {
    constructor(
        protected _aStreamErrorHandler: CanceledEventExecutor<T>,
    ) {
        super();
    }

    async handleAStreamError(canceledEvent: CanceledAStreamEvent, context: EventHandlerContext<T>): Promise<T> {
        return await this._aStreamErrorHandler(canceledEvent);
    }
}
