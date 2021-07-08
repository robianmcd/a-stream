import {CanceledAStreamEvent} from '../errors/canceled-a-stream-event';

import type {PendingEventMeta} from '../nodes/node';
import {ReadableAStream} from '../streams/readable-a-stream.interface';

export interface EventHandlerContext<TResult, TStreamNode> {
    eventId: number;
    sequenceId?: number;
    pendingEventsMap: Map<number, PendingEventMeta>;
    streamNode: TStreamNode;
    parentStreamNode: ReadableAStream<any, any>;
}

export class BaseEventHandler<T, TResult, TStreamNode> {
    setupEventHandlingTrigger(parentHandling: Promise<T>, context: EventHandlerContext<TResult, TStreamNode>): Promise<T> {
        return parentHandling;
    }

    handleFulfilledEvent(value: T, context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> {
        return Promise.resolve(<any>value);
    }

    handleRejectedEvent(reason, context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> {
        return Promise.reject(reason);
    }

    handleAStreamError(canceledEvent: CanceledAStreamEvent, context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> {
        return Promise.reject(canceledEvent);
    }
}
