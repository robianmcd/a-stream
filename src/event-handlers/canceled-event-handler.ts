import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {CanceledAStreamEvent} from '../errors/canceled-a-stream-event';

export type CanceledEventExecutor<TResult, TStreamNode> = (
    aStreamError: CanceledAStreamEvent,
    context: EventHandlerContext<TResult, TStreamNode>
) => Promise<TResult> | TResult;

export class CanceledEventHandler<T, TStreamNode> extends BaseEventHandler<T, T, TStreamNode> {
    constructor(
        protected _aStreamErrorHandler: CanceledEventExecutor<T, TStreamNode>,
    ) {
        super();
    }

    async handleAStreamError(canceledEvent: CanceledAStreamEvent, context: EventHandlerContext<T, TStreamNode>): Promise<T> {
        return await this._aStreamErrorHandler(canceledEvent, context);
    }
}
