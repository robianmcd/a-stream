import {BaseNode} from './base-node';
import {ChildNode, ChildNodeOptions} from './child-node';
import {ObsoleteAStreamError} from '../errors/obsolete-a-event-error';

declare module './base-node' {
    export interface BaseNode<T, TResult, SourceParams extends any[]> {
        latest(): LatestNode<TResult, SourceParams>;
    }
}

BaseNode.prototype.latest = function latest<NextT, T, TResult, SourceParams extends any[]>(
    this: BaseNode<T, TResult, SourceParams>
): LatestNode<TResult, SourceParams> {
    const nextStream = new LatestNode<TResult, SourceParams>({
        parentStream: this
    });
    this._nextStreams.push(nextStream);

    return nextStream;
};

export interface LatestStreamOptions<T, SourceParams extends any[]> extends ChildNodeOptions<T, SourceParams> {

}

const obsoleteErrorMsg = 'Event rejected by LatestNode because a newer event has already resolved.';

export class LatestNode<T, SourceParams extends any[]> extends ChildNode<T, T, SourceParams> {
    _pendingEventMap: Map<number, { rejectAsObsolete: () => void }>;

    constructor(
        options: LatestStreamOptions<T, SourceParams>,
    ) {
        super(options);
    }

    _setupHandling(parentHandling: Promise<T>, sequenceId: number): Promise<T> {
        const pending = new Promise<never>((resolve, reject) => {
            const pendingEventMeta = this._pendingEventMap.get(sequenceId);
            pendingEventMeta.rejectAsObsolete = () => {
                reject(new ObsoleteAStreamError(obsoleteErrorMsg));
            };
        });

        return Promise.race([parentHandling, pending]);
    }

    async _handleFulfilledEvent(value: T, sequenceId: number): Promise<T> {
        this.markPreviousEventsObsolete(sequenceId);
        return value;
    }

    async _handleRejectedEvent(reason, sequenceId: number): Promise<T> {
        this.markPreviousEventsObsolete(sequenceId);
        return Promise.reject(reason);
    }

    protected markPreviousEventsObsolete(sequenceId) {
        for (const [pendingSequenceId, eventMeta] of this._pendingEventMap) {
            if (pendingSequenceId < sequenceId) {
                eventMeta.rejectAsObsolete();
            } else {
                break;
            }
        }
    }
}
