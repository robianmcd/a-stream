import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {SkippedAStreamError} from '../errors/skipped-a-stream-error';
import {SourceNode} from '../nodes/source-node';
import {RunOptions} from '../streams/run-options';

export class PendingChangesEventHandler<T> extends BaseEventHandler<T, boolean> {
    protected _pendingSourceNode: SourceNode<T, boolean>;
    protected _parentPendingEvents: Set<number> = new Set();

    init(pendingSourceNode: SourceNode<T, boolean>) {
        this._pendingSourceNode = pendingSourceNode;
    }

    setupEventHandlingTrigger(parentHandling: Promise<T>, {sequenceId}: EventHandlerContext): Promise<T> {
        if (this._parentPendingEvents.size === 0) {
            this._pendingSourceNode.sendOutputEvent(true, this._pendingSourceNode, new RunOptions());
        }
        this._parentPendingEvents.add(sequenceId);
        return parentHandling;
    }

    async handleEvent({sequenceId}: EventHandlerContext): Promise<boolean> {
        if (this._parentPendingEvents.size === 1 && this._parentPendingEvents.has(sequenceId)) {
            this._pendingSourceNode.sendOutputEvent(false, this._pendingSourceNode, new RunOptions());
        }
        this._parentPendingEvents.delete(sequenceId);
        return Promise.reject(new SkippedAStreamError('event skipped by PendingChangesEventHandler because it doesn\'t forward input events downstream.'));
    }

    handleFulfilledEvent(value: T, context: EventHandlerContext): Promise<boolean> {
        return this.handleEvent(context);
    }

    handleRejectedEvent(reason, context: EventHandlerContext): Promise<boolean> {
        return this.handleEvent(context);
    }
}
