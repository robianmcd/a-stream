import {ObsoleteAStreamError} from '../errors/obsolete-a-event-error';
import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {PendingEventMeta} from '../nodes/node';

const obsoleteErrorMsg = 'Event rejected by LatestEventHandler because a newer event has already resolved.';

export class LatestEventHandler<T, SourceParams extends any[]> extends BaseEventHandler<T, T> {
    _rejectPendingEventMap: WeakMap<PendingEventMeta, () => void> = new WeakMap();

    constructor() {
        super();
    }

    setupEventHandlingTrigger(
        parentHandling: Promise<T>,
        {sequenceId, pendingEventsMap}: EventHandlerContext
    ): Promise<T> {
        const childrenPending = new Promise<never>((resolve, reject) => {
            const pendingEventMeta = pendingEventsMap.get(sequenceId);
            this._rejectPendingEventMap.set(pendingEventMeta, () => {
                reject(new ObsoleteAStreamError(obsoleteErrorMsg));
            });
        });

        return Promise.race([parentHandling, childrenPending]);
    }

    async handleFulfilledEvent(value: T, context: EventHandlerContext): Promise<T> {
        this._markPreviousEventsObsolete(context);
        return value;
    }

    async handleRejectedEvent(reason, context: EventHandlerContext): Promise<T> {
        this._markPreviousEventsObsolete(context);
        return Promise.reject(reason);
    }

    protected _markPreviousEventsObsolete({sequenceId, pendingEventsMap}: EventHandlerContext) {
        for (const [pendingSequenceId, pendingEventMeta] of pendingEventsMap) {
            if (pendingSequenceId < sequenceId) {
                const rejectAsObsolete = this._rejectPendingEventMap.get(pendingEventMeta);
                rejectAsObsolete();
            } else {
                break;
            }
        }
    }
}
