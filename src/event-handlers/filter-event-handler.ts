import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../errors/canceled-a-stream-event';

export interface PredicateFunction<T, TStreamNode> {
    (value: T, context: EventHandlerContext<T, TStreamNode>): Promise<boolean> | boolean
}

export class FilterEventHandler<T, TStreamNode> extends BaseEventHandler<T, T, TStreamNode> {
    protected _predicate: PredicateFunction<T, TStreamNode>;

    constructor(
        predicate: PredicateFunction<T, TStreamNode>,
    ) {
        super();
        this._predicate = predicate;
    }

    async handleFulfilledEvent(value: T, context: EventHandlerContext<T, TStreamNode>): Promise<T> {
        let filterResult = await this._predicate(value, context);
        if (filterResult) {
            return value;
        } else {
            return Promise.reject(new CanceledAStreamEvent(CanceledAStreamEventReason.Skipped, 'Event skipped by filter.'));
        }
    }
}
