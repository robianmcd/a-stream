import type {PendingEventMeta} from '../nodes/node';

export interface EventHandlerContext {
    sequenceId: number,
    pendingEventsMap: Map<number, PendingEventMeta>;
}

export class BaseEventHandler<T, TResult> {
    setupEventHandlingTrigger(parentHandling: Promise<T>, context: EventHandlerContext): Promise<T> {
        return parentHandling;
    }

    handleFulfilledEvent(value: T, context: EventHandlerContext): Promise<TResult> {
        return Promise.resolve(<any>value);
    }

    handleRejectedEvent(reason, context: EventHandlerContext): Promise<TResult> {
        return Promise.reject(reason);
    }
}
