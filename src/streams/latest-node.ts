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
    constructor(
        options: LatestStreamOptions<T, SourceParams>,
    ) {
        super(options);
    }

    async _handleFulfilledEvent(value: T, sequenceId: number): Promise<T> {
        if (this._lastCompletedSequenceId < sequenceId) {
            return value;
        } else {
            return Promise.reject(new ObsoleteAStreamError(obsoleteErrorMsg));
        }
    }

    async _handleRejectedEvent(reason, sequenceId: number): Promise<T> {
        if (this._lastCompletedSequenceId < sequenceId) {
            return Promise.reject(reason);
        } else {
            return Promise.reject(new ObsoleteAStreamError(obsoleteErrorMsg));
        }
    }
}
