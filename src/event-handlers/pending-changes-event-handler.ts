import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {SkippedAStreamError} from '../errors/skipped-a-stream-error';
import {SourceNode} from '../nodes/source-node';
import {RunOptions} from '../streams/run-options';
import {Deferred} from '../promise-util/Deferred';

export class PendingChangesEventHandler<T> extends BaseEventHandler<T, boolean> {
    protected _sourceNodeInitializing: Deferred<SourceNode<T, boolean>> = new Deferred<SourceNode<T, boolean>>();
    protected _parentPendingEvents: Set<number> = new Set();
    protected _pendingState: boolean;

    init(pendingSourceNode: SourceNode<T, boolean>) {
        this._sourceNodeInitializing.resolve(pendingSourceNode);
    }

    async setupEventHandlingTrigger(parentHandling: Promise<T>, {sequenceId}: EventHandlerContext<boolean>): Promise<T> {
        if (this._parentPendingEvents.size === 0) {
            let sourceNode = await this._sourceNodeInitializing;

            //Skip the pending true event if the promise is already resolved.
            let parentHandlingResolved = false;
            parentHandling.then(() => parentHandlingResolved = true);
            let queueingEvent = new Promise(res => setTimeout(res));
            await Promise.race([parentHandling, queueingEvent]);
            if (parentHandlingResolved === false && this._pendingState !== true) {
                this._pendingState = true;
                sourceNode.sendOutputEvent(true, sourceNode, new RunOptions());
            }
        }
        this._parentPendingEvents.add(sequenceId);
        return parentHandling;
    }

    async handleEvent({sequenceId}: EventHandlerContext<boolean>): Promise<boolean> {
        if (this._parentPendingEvents.size === 1 && this._parentPendingEvents.has(sequenceId)) {
            let sourceNode = await this._sourceNodeInitializing;
            if (this._pendingState !== false) {
                this._pendingState = false;
                sourceNode.sendOutputEvent(false, sourceNode, new RunOptions());
            }
        }
        this._parentPendingEvents.delete(sequenceId);
        return Promise.reject(new SkippedAStreamError('event skipped by PendingChangesEventHandler because it doesn\'t forward input events downstream.'));
    }

    handleFulfilledEvent(value: T, context: EventHandlerContext<boolean>): Promise<boolean> {
        return this.handleEvent(context);
    }

    handleRejectedEvent(reason, context: EventHandlerContext<boolean>): Promise<boolean> {
        return this.handleEvent(context);
    }
}
