import type {PendingEventMeta} from '../nodes/node';
import {AStreamError} from '../errors/a-stream-error';

export interface EventHandlerContext<TResult> {
    sequenceId: number,
    pendingEventsMap: Map<number, PendingEventMeta<TResult>>;
}

export class BaseEventHandler<T, TResult> {
    setupEventHandlingTrigger(parentHandling: Promise<T>, context: EventHandlerContext<TResult>): Promise<T> {
        return parentHandling;
    }

    handleFulfilledEvent(value: T, context: EventHandlerContext<TResult>): Promise<TResult> {
        return Promise.resolve(<any>value);
    }

    handleRejectedEvent(reason, context: EventHandlerContext<TResult>): Promise<TResult> {
        return Promise.reject(reason);
    }

    handleAStreamError(aStreamError: AStreamError, context: EventHandlerContext<TResult>): Promise<TResult> {
        return Promise.reject(aStreamError);
    }
}
