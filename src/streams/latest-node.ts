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
    _obsoleteTriggers: Array<{sequenceId: number, markObsolete: Function}> = [];

    constructor(
        options: LatestStreamOptions<T, SourceParams>,
    ) {
        super(options);
    }

    _setupHandling(parentHandling: Promise<T>, sequenceId: number): Promise<T> {
        const pending = new Promise<never>((resolve, reject) => {
            const markObsolete = () => reject(new ObsoleteAStreamError(obsoleteErrorMsg));
            this._obsoleteTriggers.push({sequenceId, markObsolete});
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
        while(this._obsoleteTriggers.length && this._obsoleteTriggers[0].sequenceId < sequenceId) {
            const curTrigger = this._obsoleteTriggers.shift();
            curTrigger.markObsolete();
        }
    }
}
