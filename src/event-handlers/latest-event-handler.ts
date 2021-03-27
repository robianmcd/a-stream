import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../errors/canceled-a-stream-event';
import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {PendingEventMeta} from '../nodes/node';

const obsoleteErrorMsg = 'Event rejected by LatestEventHandler because a newer event has already resolved.';

export class LatestEventHandler<T, SourceParams> extends BaseEventHandler<T, T> {
    _rejectPendingEventMap: WeakMap<PendingEventMeta<T>, () => void> = new WeakMap();

    constructor() {
        super();
    }

    setupEventHandlingTrigger(
        parentHandling: Promise<T>,
        {sequenceId, pendingEventsMap}: EventHandlerContext<T>
    ): Promise<T> {
        const childrenPending = new Promise<never>((resolve, reject) => {
            const pendingEventMeta = pendingEventsMap.get(sequenceId);
            this._rejectPendingEventMap.set(pendingEventMeta, () => {
                reject(new CanceledAStreamEvent(CanceledAStreamEventReason.Obsolete, obsoleteErrorMsg));
            });
        });

        return Promise.race([parentHandling, childrenPending]);
    }

    async handleFulfilledEvent(value: T, context: EventHandlerContext<T>): Promise<T> {
        this._markPreviousEventsObsolete(context);
        return value;
    }

    async handleRejectedEvent(reason, context: EventHandlerContext<T>): Promise<T> {
        this._markPreviousEventsObsolete(context);
        return Promise.reject(reason);
    }

    protected _markPreviousEventsObsolete({sequenceId, pendingEventsMap}: EventHandlerContext<T>) {
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
