import {BaseEventHandler, EventHandlerContext} from '../event-handlers/base-event-handler';
import {CanceledAStreamError} from '../errors/canceled-a-stream-error';
import {AStreamError} from '../errors/a-stream-error';
import type {AStreamOptions} from '../streams/a-stream';
import {RunOptions} from '../streams/run-options';
import {InputConnectionMgr} from './input-connection-mgr.interface';
import {ParentInputConnectionMgr} from './parent-input-connection-mgr';
import {SourceNode} from './source-node';

export interface PendingEventMeta {
    sequenceId: number,
    sourceTimestamp: number
}

export interface NodeOptions<T, TResult> {
    eventHandler: BaseEventHandler<T, TResult>,
    inputConnectionMgr: InputConnectionMgr,
    forwardInputEvents?: boolean
}

export class Node<T, TResult> {
    acceptingEvents: Promise<any>;
    readonly streamOptions: AStreamOptions;

    get connected(): boolean {
        return this._inputConnectionMgr.connected;
    }

    get pending() {
        return this._pendingEventMap.size > 0
    };

    status: 'success' | 'error' | 'uninitialized' = 'uninitialized';
    value: TResult;
    error: any;

    initializing = new Promise<void>((resolve, reject) => {
        this._resolveInitializing = resolve;
        this._rejectInitializing = reject;
    });

    rejectAcceptingEventsPromise: (reason: CanceledAStreamError) => void;

    protected _resolveInitializing: () => void;
    protected _rejectInitializing: () => void;
    protected _parentNode?: Node<any, T>
    protected _pendingEventMap: Map<number, PendingEventMeta>;
    protected _latestCompletedSequenceId;
    protected _eventHandler: BaseEventHandler<T, TResult>;
    protected _childNodes: Node<TResult, unknown>[];
    protected _forwardInputEvents: boolean;
    protected _inputConnectionMgr: InputConnectionMgr;

    constructor(
        nodeOptions: NodeOptions<T, TResult>,
        streamOptions: AStreamOptions
    ) {
        this._eventHandler = nodeOptions.eventHandler;
        nodeOptions.inputConnectionMgr.init(this);
        this._inputConnectionMgr = nodeOptions.inputConnectionMgr;
        //TODO: see if typescript polyfills operator for this
        this._forwardInputEvents = nodeOptions.forwardInputEvents !== undefined ? nodeOptions.forwardInputEvents : true;
        this.streamOptions = streamOptions;

        this.acceptingEvents = new Promise((resolve, reject) => {
            this.rejectAcceptingEventsPromise = reject;
        });

        this._childNodes = [];
        this.status = 'uninitialized';
        this._latestCompletedSequenceId = -1;
        this._pendingEventMap = new Map();
    }

    async disconnect(): Promise<void> {
        this._inputConnectionMgr.disconnect();
        await Promise.all(this._childNodes.map((node) => {
            return node.disconnect();
        }));
        this.rejectAcceptingEventsPromise(new CanceledAStreamError('Stream canceled by call to disconnect()'));

        if (this.status === 'uninitialized') {
            this._rejectInitializing();
        }

        return this.acceptingEvents.catch(() => {});
    }

    disconnectDownstream(node: Node<any, any>): Promise<void> {
        let nodeIndex = this._childNodes.findIndex(n => n.connectedToDownstreamNode(node));
        if (nodeIndex !== -1) {
            return this._childNodes[nodeIndex].disconnect();
        } else {
            throw new Error("Node doesn't exist downstream of parent");
        }
    }

    connectedToChildNode(node: Node<any, any>): boolean {
        return this._childNodes.some(n => n === node);
    }

    connectedToDownstreamNode(node: Node<any, any>): boolean {
        if (node === this) {
            return true;
        } else if (this.connectedToChildNode(node)) {
            return true;
        } else {
            return this._childNodes.some(s => s.connectedToDownstreamNode(node));
        }
    }

    _removeChildNode(childNode: Node<TResult, any>) {
        const childNodeIndex = this._childNodes.findIndex(n => n === childNode);
        if (childNodeIndex !== -1) {
            this._childNodes.splice(childNodeIndex, 1);
        } else {
            throw new Error("Node doesn't exist in parent");
        }
    }

    runNode<TInitiatorResult>(
        parentHandling: Promise<T>,
        initiatorNode: Node<unknown, TInitiatorResult>,
        sequenceId: number,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined {
        this._onOutputEventStart(sequenceId);

        const eventHandling = this._setupInputEventHandling(parentHandling, sequenceId);

        let resultFromChildren = undefined;
        if (this._forwardInputEvents) {
            resultFromChildren = this._setupOutputEvent(eventHandling, initiatorNode, sequenceId, runOptions);
        }

        if (this === initiatorNode as any) {
            return <any>eventHandling
                .catch((reason) => {
                    if (runOptions.rejectAStreamErrors === false && reason instanceof AStreamError) {
                        return new Promise(() => {});
                    } else {
                        return eventHandling;
                    }
                });
        } else {
            return resultFromChildren;
        }
    }

    addChild<TChildResult>(childEventHandler: BaseEventHandler<TResult, TChildResult>): Node<TResult, TChildResult> {
        let inputConnectionMgr = new ParentInputConnectionMgr(this);
        let childNode = new Node({inputConnectionMgr, eventHandler: childEventHandler}, this.streamOptions);
        this._childNodes.push(childNode);
        return childNode;
    }

    addAdapter<TChildResult>(childEventHandler: BaseEventHandler<TResult, TChildResult>): SourceNode<TResult, TChildResult> {
        let inputConnectionMgr = new ParentInputConnectionMgr(this);
        let nodeOptions = {
            inputConnectionMgr,
            eventHandler: childEventHandler,
            forwardInputEvents: false
        };
        let adapterNode = new SourceNode(nodeOptions, this.streamOptions);
        this._childNodes.push(adapterNode);
        return adapterNode;
    }

    protected _setupInputEventHandling<TInitiatorResult>(
        parentHandling: Promise<T>,
        sequenceId: number,
    ): Promise<TResult> {
        const getEventHandlerContext = (): EventHandlerContext => {
            return {
                sequenceId,
                pendingEventsMap: new Map(this._pendingEventMap)
            }
        }

        const eventHandlingTrigger = Promise.race([
            this._eventHandler.setupEventHandlingTrigger(parentHandling, getEventHandlerContext()),
            this.acceptingEvents
        ]);

        return eventHandlingTrigger
            .then(
                (result) => {
                    return this._eventHandler.handleFulfilledEvent(result, getEventHandlerContext());
                },
                (reason) => {
                    if (reason instanceof AStreamError) {
                        return this._eventHandler.handleAStreamError(reason, getEventHandlerContext());
                    } else {
                        return this._eventHandler.handleRejectedEvent(reason, getEventHandlerContext());
                    }
                }
            );
    }

    protected _onOutputEventStart(sequenceId) {
        this._pendingEventMap.set(sequenceId, {sequenceId, sourceTimestamp: Date.now()});
    }

    protected _setupOutputEvent<TInitiatorResult>(
        eventHandling: Promise<TResult>,
        initiatorNode: Node<unknown, TInitiatorResult>,
        sequenceId: number,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined {
        eventHandling
            .then(
                (value: TResult) => {
                    this._pendingEventMap.delete(sequenceId);
                    if (this._latestCompletedSequenceId < sequenceId) {
                        this._latestCompletedSequenceId = sequenceId;
                        this.status = 'success';
                        this.value = value;
                        this.error = undefined;
                        this._resolveInitializing(); // if it is already  resolved this will have no effect
                    }
                },
                (reason) => {
                    this._pendingEventMap.delete(sequenceId);
                    if (
                        this._latestCompletedSequenceId < sequenceId &&
                        (reason instanceof AStreamError) === false
                    ) {
                        this._latestCompletedSequenceId = sequenceId;
                        this.status = 'error';
                        this.error = reason;
                        this.value = undefined;
                        this._resolveInitializing(); // if it is already resolved this will have no effect
                    }
                }
            );

        return this._runDownStream(eventHandling, initiatorNode, sequenceId, runOptions);
    }

    // Runs downstream nodes. If initiatorStream is a child of this stream then returns a promise that resolves with
    // the result of the initiator stream. Otherwise returns undefined.
    protected _runDownStream<TInitiatorResult>(
        nodeHandling: Promise<TResult>,
        initiatorStream: Node<unknown, TInitiatorResult>,
        sequenceId: number,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined {
        return this._childNodes
            .map(stream => {
                return stream.runNode(nodeHandling, initiatorStream, sequenceId, runOptions)
            })
            .reduce((acc, e) => acc || e, undefined);
    }
}
