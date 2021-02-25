import {ObsoleteAStreamError} from '../errors/obsolete-a-event-error';
import {BaseEventHandler} from './base-event-handler';

const obsoleteErrorMsg = 'Event rejected by LatestEventHandler because a newer event has already resolved.';

export class LatestEventHandler<T, SourceParams extends any[]> extends BaseEventHandler<T, T> {
    _rejectPendingEventMap: Map<number, () => void> = new Map();

    constructor() {
        super();
    }

    setupEventHandlingTrigger(parentHandling: Promise<T>, sequenceId: number): Promise<T> {
        const childrenPending = new Promise<never>((resolve, reject) => {
            this._rejectPendingEventMap.set(sequenceId, () => {
                reject(new ObsoleteAStreamError(obsoleteErrorMsg));
            });
        });

        return Promise.race([parentHandling, childrenPending]);
    }

    async handleFulfilledEvent(value: T, sequenceId: number): Promise<T> {
        this._rejectPendingEventMap.delete(sequenceId);
        this._markPreviousEventsObsolete(sequenceId);
        return value;
    }

    async handleRejectedEvent(reason, sequenceId: number): Promise<T> {
        this._rejectPendingEventMap.delete(sequenceId);
        this._markPreviousEventsObsolete(sequenceId);
        return Promise.reject(reason);
    }

    protected _markPreviousEventsObsolete(sequenceId) {
        for (const [pendingSequenceId, rejectAsObsolete] of this._rejectPendingEventMap) {
            if (pendingSequenceId < sequenceId) {
                rejectAsObsolete();
            } else {
                break;
            }
        }
    }
}
