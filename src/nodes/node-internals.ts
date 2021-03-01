import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {CanceledAStreamError} from '../errors/canceled-a-stream-error';
import {AStreamError} from '../errors/a-stream-error';

export interface NodeInternalsOptions<T, TResult> {
    eventHandler: BaseEventHandler<T, TResult>,
}

export abstract class NodeInternals<T, TResult> {
    acceptingEvents: Promise<any>;
    abstract get connected(): boolean;

    get pending() {
        return this._pendingEventSet.size > 0
    };

    status: 'success' | 'error' | 'uninitialized' = 'uninitialized';
    value: TResult;
    error: any;

    rejectAcceptingEventsPromise: (reason: CanceledAStreamError) => void;

    protected _parentNodeInternals?: NodeInternals<any, T>
    protected _pendingEventSet: Set<number>;
    protected _latestStartedSequenceId;
    protected _latestCompletedSequenceId;
    protected _eventHandler: BaseEventHandler<T, TResult>;
    protected _nextStreams: NodeInternals<TResult, unknown>[];

    constructor(
        options: NodeInternalsOptions<T, TResult>,
    ) {
        this._eventHandler = options.eventHandler;

        this.acceptingEvents = new Promise((resolve, reject) => {
            this.rejectAcceptingEventsPromise = reject;
        });

        this._nextStreams = [];
        this.status = 'uninitialized';
        this._latestStartedSequenceId = -1;
        this._latestCompletedSequenceId = -1;
        this._pendingEventSet = new Set();
    }

    async disconnect(): Promise<void> {
        //TODO: recursively cancel downstream
        this.rejectAcceptingEventsPromise(new CanceledAStreamError('Stream canceled by call to disconnect()'));
        return this.acceptingEvents.catch(() => {});
    }

    disconnectDownstream(node: NodeInternals<any, any>): void {
        let streamIndex = this._nextStreams.findIndex(s => s.connectedToDownstreamNode(node));
        if (streamIndex !== -1) {
            this._nextStreams.splice(streamIndex, 1);
        } else {
            throw new Error("Stream doesn't exist in parent");
        }
    }

    connectedToChildNode(node: NodeInternals<any, any>): boolean {
        return this._nextStreams.some(s => s === node);
    }

    connectedToDownstreamNode(node: NodeInternals<any, any>): boolean {
        if(node === this) {
            return true;
        } else if (this.connectedToChildNode(node)) {
            return true;
        } else {
            return this._nextStreams.some(s => s.connectedToDownstreamNode(node));
        }
    }

    protected _runNode<TInitiatorResult>(
        parentHandling: Promise<T>,
        initiatorStream: NodeInternals<unknown, TInitiatorResult>,
        sequenceId: number
    ): Promise<TInitiatorResult> | undefined {
        this._pendingEventSet.add(sequenceId);

        if (sequenceId > this._latestStartedSequenceId) {
            this._latestStartedSequenceId = sequenceId;
        }

        const eventHandlingTrigger = Promise.race([
            this._eventHandler.setupEventHandlingTrigger(parentHandling, sequenceId),
            this.acceptingEvents
        ]);

        const eventHandling = eventHandlingTrigger
            .then(
                (result) => {
                    return this._eventHandler.handleFulfilledEvent(result, sequenceId);
                },
                (reason) => {
                    return this._eventHandler.handleRejectedEvent(reason, sequenceId);
                }
            );

        eventHandling
            .then(
                (value: TResult) => {
                    this._pendingEventSet.delete(sequenceId);
                    if (this._latestCompletedSequenceId < sequenceId) {
                        this._latestCompletedSequenceId = sequenceId;
                        this.status = 'success';
                        this.value = value;
                        this.error = undefined;
                    }
                },
                (reason) => {
                    this._pendingEventSet.delete(sequenceId);
                    if (
                        this._latestCompletedSequenceId < sequenceId &&
                        (reason instanceof AStreamError) === false
                    ) {
                        this._latestCompletedSequenceId = sequenceId;
                        this.status = 'error';
                        this.error = reason;
                        this.value = undefined;
                    }
                }
            );

        const runDownStreamPromise = this._runDownStream(eventHandling, initiatorStream, sequenceId);

        if (this === initiatorStream as any) {
            return <any>eventHandling;
        } else {
            return runDownStreamPromise;
        }
    }

    // Runs downstream nodes. If initiatorStream is a child of this stream then returns a promise that resolves with
    // the result of the initiator stream. Otherwise returns undefined.
    protected _runDownStream<TInitiatorResult>(
        nodeHandling: Promise<TResult>,
        initiatorStream: NodeInternals<unknown, TInitiatorResult>,
        sequenceId: number
    ): Promise<TInitiatorResult> | undefined {
        return this._nextStreams
            .map(stream => {
                return stream._runNode(nodeHandling, initiatorStream, sequenceId)
            })
            .reduce((acc, e) => acc || e, undefined);
    }
}
