import {CanceledAStreamError} from '../errors/canceled-a-stream-error';
import {AStreamError} from '../errors/a-stream-error';
import {AStream} from './a-stream';
import type {ChildNode} from './child-node';
import {ReadableNode} from './readable-node.interface';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {CustomEventHandler, Executor} from '../event-handlers/custom-event-handler';
import {CatchEventHandler, RejectedExecutor} from '../event-handlers/catch-event-handler';
import {DebounceEventHandler} from '../event-handlers/debounce-event-handler';
import {LatestEventHandler} from '../event-handlers/latest-event-handler';

export interface BaseNodeOptions<T, TResult, SourceParams extends any[]> {
    eventHandler: BaseEventHandler<T, TResult>
}

export abstract class BaseNode<T, TResult = T, SourceParams extends any[] = [T]> extends Function implements ReadableNode<T, TResult> {
    acceptingEvents: Promise<any>;
    isDisconnected;

    get pending() {
        return this._pendingEventSet.size > 0
    };

    //Can be overridden by Proxy in call to .asReadonly()
    get readonly() {
        return false
    };

    abstract get connected(): boolean;

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
        return this._sourceStream.disconnect();
    }

    async disconnect(): Promise<void> {
        this._rejectAcceptingEventsPromise(new CanceledAStreamError('Stream canceled by call to disconnect()'));
        return this.acceptingEvents.catch(() => {});
    }

    disconnectDownstream(node: ReadableNode<any, any>): void {
        let streamIndex = this._nextStreams.findIndex(s => s.connectedToDownstreamNode(node));
        if (streamIndex !== -1) {
            this._nextStreams.splice(streamIndex, 1);
        } else {
            throw new Error("Stream doesn't exist in parent");
        }
    }

    connectedToChildNode(node: ReadableNode<any, any>): boolean {
        return this._nextStreams.some(s => s === node);
    }

    connectedToDownstreamNode(node: ReadableNode<any, any>): boolean {
        if(node === this) {
          return true;
        } else if (this.connectedToChildNode(node)) {
            return true;
        } else {
            return this._nextStreams.some(s => s.connectedToDownstreamNode(node));
        }
    }

    asReadonly(): ReadableNode<T, TResult> {
        const restrictedMethods = ['run', 'endStream', 'disconnect'];
        const readonlyProxy = new Proxy(this, {
            get(self, prop) {
                if (restrictedMethods.includes(<string>prop)) {
                    return undefined;
                } else if (prop === 'readonly') {
                    return true;
                } else {
                    let value = self[prop];
                    return (typeof value === 'function') ? value.bind(readonlyProxy) : value;
                }
            },
            apply(): never {
                throw new TypeError(`readonly AStream node is not a function.`);
            }
        });
        return readonlyProxy;
    }

    next<TChildResult>(fulfilledEventHandler: Executor<TResult, TChildResult>): BaseNode<TResult, TChildResult, SourceParams> {
        const customEventHandler = new CustomEventHandler<TResult, TChildResult>(fulfilledEventHandler);
        return this.addChild(customEventHandler);
    };

    catch(rejectedEventHandler: RejectedExecutor<TResult>): BaseNode<TResult, TResult, SourceParams> {
        const catchEventHandler = new CatchEventHandler<TResult>(rejectedEventHandler);
        return this.addChild(catchEventHandler);
    };

    debounce(durationMs: number = 200): BaseNode<TResult, TResult, SourceParams> {
        const debounceEventHandler = new DebounceEventHandler<TResult>(durationMs);
        return this.addChild(debounceEventHandler);
    };

    latest<TChildResult>(): BaseNode<TResult, TResult, SourceParams> {
        const latestNode = new LatestEventHandler<TResult, SourceParams>();
        return this.addChild(latestNode);
    };

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
