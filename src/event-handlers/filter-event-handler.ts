import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {SkippedAStreamError} from '../errors/skipped-a-stream-error';

export interface PredicateFunction<T> {
    (value: T): Promise<boolean> | boolean
}

export class FilterEventHandler<T> extends BaseEventHandler<T, T> {
    protected _predicate: PredicateFunction<T>;

    constructor(
        predicate: PredicateFunction<T>,
    ) {
        super();
        this._predicate = predicate;
    }

    async handleFulfilledEvent(value: T, context: EventHandlerContext<T>): Promise<T> {
        let filterResult = await this._predicate(value);
        if (filterResult) {
            return value;
        } else {
            return Promise.reject(new SkippedAStreamError('Event skipped by filter.'));
        }
    }
}
