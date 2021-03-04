import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {SkippedAStreamError} from '../errors/skipped-a-stream-error';

export class PendingChangesEventHandler<T> extends BaseEventHandler<T, boolean> {
    setupEventHandlingTrigger(parentHandling: Promise<T>, {sequenceId, pendingEventsMap}: EventHandlerContext): Promise<T> {
        if (pendingEventsMap.size === 1 && pendingEventsMap.has(sequenceId)) {
            return Promise.resolve(null);
        } else {
            return parentHandling;
        }
    }

    async handleEvent({sequenceId, pendingEventsMap}: EventHandlerContext): Promise<boolean> {
        if (pendingEventsMap.size === 1 && pendingEventsMap.has(sequenceId)) {
            return false;
        } else {
            return Promise.reject(new SkippedAStreamError('event skipped by PendingChangesEventHandler because pending status in unchanged.'));
        }
    }

    handleFulfilledEvent(value: T, context: EventHandlerContext): Promise<boolean> {
        return this.handleEvent(context);
    }

    handleRejectedEvent(reason, context: EventHandlerContext): Promise<boolean> {
        return this.handleEvent(context);
    }
}
