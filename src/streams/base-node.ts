import {CanceledAStreamError} from '../errors/canceled-a-stream-error';
import {AStreamError} from '../errors/a-stream-error';
import {AStream} from './a-stream';
import type {ChildNode} from './child-node';
import {ReadableNode} from './readable-node.interface';
import {BaseEventHandler} from '../event-handlers/base-event-handler';

export interface BaseNodeOptions<T, TResult, SourceParams extends any[]> {
    eventHandler: BaseEventHandler<T, TResult>
}

export abstract class BaseNode<T, TResult = T, SourceParams extends any[] = [T]> extends Function implements ReadableNode<T, TResult> {
    acceptingEvents: Promise<any>;
    isDisconnected;
    get isPending() { return this._pendingEventSet.size > 0 };

    status: 'success' | 'error' | 'uninitialized' = 'uninitialized';
    value: TResult;
    error: any;

    protected _pendingEventSet: Set<number>;
    protected _latestStartedSequenceId;
    protected _latestCompletedSequenceId;
    protected _eventHandler: BaseEventHandler<T, TResult>;
    protected _nextStreams: ChildNode<TResult, unknown, SourceParams>[];
    protected _rejectAcceptingEventsPromise: (reason: CanceledAStreamError) => void;
    private _self: BaseNode<T, TResult, SourceParams>;

    abstract get _sourceStream(): AStream<SourceParams, unknown>;

    protected constructor(
        options: BaseNodeOptions<T, TResult, SourceParams>,
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self = this.bind(this);

        this._self._eventHandler = options.eventHandler;

        this._self.acceptingEvents = new Promise((resolve, reject) => {
            this._self._rejectAcceptingEventsPromise = reject;
        });

        this._self._nextStreams = [];
        this._self.status = 'uninitialized';
        this._self._latestStartedSequenceId = -1;
        this._self._latestCompletedSequenceId = -1;
        this._self._pendingEventSet = new Set();
        this._self.isDisconnected = false;

        return this._self;
    }

    hasValue(): boolean { return this.status === 'success' }
    hasError(): boolean { return this.status === 'error' }
    isInitialized(): boolean { return this.status !== 'uninitialized' }

    run(...args: SourceParams): Promise<TResult> {
        if (this.isDisconnected) {
            return this.acceptingEvents;
        } else {
            return this._sourceStream._runSource(args, this);
        }
    }

    endStream(): Promise<void> {
        return this._sourceStream.disconnectNode();
    }

    async disconnectNode(): Promise<void> {
        await Promise.all(this._nextStreams.map(s => s.disconnectNode()));

        this.isDisconnected = true;
        this._rejectAcceptingEventsPromise(new CanceledAStreamError('Stream canceled by call to disconnectNode()'));
        return this.acceptingEvents.catch(() => {});
    }

    asReadonly(): ReadableNode<T, TResult> {
        //TODO: hide non-readonly methods
        return new Proxy(this, {});
    }

    removeChildNode(node: ChildNode<TResult, unknown, SourceParams>): void {
        let streamIndex = this._nextStreams.findIndex(s => s === node);
        if (streamIndex !== -1) {
            this._nextStreams.splice(streamIndex, 1);
        } else {
            throw new Error("Stream doesn't exist in parent");
        }
    }

    _runNode<TInitiatorResult>(
        parentHandling: Promise<T>,
        initiatorStream: BaseNode<unknown, TInitiatorResult, SourceParams>,
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
        initiatorStream: BaseNode<unknown, TInitiatorResult, SourceParams>,
        sequenceId: number
    ): Promise<TInitiatorResult> | undefined {
        return this._nextStreams
            .map(stream => {
                return stream._runNode(nodeHandling, initiatorStream, sequenceId)
            })
            .reduce((acc, e) => acc || e, undefined);
    }
}

export interface BaseNode<T, TResult, SourceParams extends any[]> {
    (...args: SourceParams): Promise<TResult>;
}
