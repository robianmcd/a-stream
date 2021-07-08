import {EventHandlerContext} from './base-event-handler';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../errors/canceled-a-stream-event';
import {RunOptions} from '../streams/run-options';
import {BaseAdapterEventHandler} from './base-adapter-event-handler';

export class PendingChangesEventHandler<T, TStreamNode> extends BaseAdapterEventHandler<T, boolean, TStreamNode> {
    protected _parentPendingEvents: Set<number> = new Set();
    protected _pendingState: boolean;

    async setupEventHandlingTrigger(parentHandling: Promise<T>, {eventId}: EventHandlerContext<boolean, TStreamNode>): Promise<T> {
        if (this._parentPendingEvents.size === 0) {
            //Skip the pending true event if the promise is already resolved.
            let parentHandlingResolved = false;
            parentHandling.then(() => parentHandlingResolved = true);
            let queueingEvent = new Promise(res => setTimeout(res));
            await Promise.race([parentHandling, queueingEvent]);
            if (parentHandlingResolved === false && this._pendingState !== true) {
                this._pendingState = true;
                this.sourceNode.sendOutputEvent(true, this.sourceNode, new RunOptions());
            }
        }
        this._parentPendingEvents.add(eventId);
        return parentHandling;
    }

    async handleEvent({eventId}: EventHandlerContext<boolean, TStreamNode>): Promise<boolean> {
        if (this._parentPendingEvents.size === 1 && this._parentPendingEvents.has(eventId)) {
            if (this._pendingState !== false) {
                this._pendingState = false;
                this.sourceNode.sendOutputEvent(false, this.sourceNode, new RunOptions());
            }
        }
        this._parentPendingEvents.delete(eventId);
        return Promise.reject(new CanceledAStreamEvent(
            CanceledAStreamEventReason.Terminated,
            'event terminated by PendingChangesEventHandler because it doesn\'t forward input events downstream.'
        ));
    }

    handleFulfilledEvent(value: T, context: EventHandlerContext<boolean, TStreamNode>): Promise<boolean> {
        return this.handleEvent(context);
    }

    handleRejectedEvent(reason, context: EventHandlerContext<boolean, TStreamNode>): Promise<boolean> {
        return this.handleEvent(context);
    }
}
