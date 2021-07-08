import {BaseEventHandler, EventHandlerContext} from '../event-handlers/base-event-handler';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../errors/canceled-a-stream-event';
import {RunOptions} from '../streams/run-options';
import {InputConnectionMgr} from './input-connection-mgr.interface';

import type {AStreamOptions} from '../streams/a-stream';
import {generateNextId} from '../event-id-issuer';

export interface PendingEventMeta {
    eventId: number;
    sequenceId?: number;
    sourceTimestamp: number;
    parentStreamNode: any;
}

interface InternalPendingEventMeta<TResult> {
    eventHandling?: Promise<TResult>;
    rejectAsObsolete?: () => void;
}

export interface NodeOptions<TResult> {
    terminateInputEvents?: boolean;
    initialValue?: TResult;
}

export interface AddChildOptions {
    ignoreInitialParentState?: boolean;
}

export type AddChildNodeOptions<TResult> = NodeOptions<TResult> | AddChildOptions;
export type AddAdapterNodeOptions<TResult> = Omit<AddChildNodeOptions<TResult>, 'terminateInputEvents' | 'ignoreInitialParentState'>;

export class Node<T, TResult, TStreamNode = unknown> {
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

    rejectAcceptingEventsPromise: (canceledAStreamEvent: CanceledAStreamEvent) => void;

    _nextSequenceId = 0;
    protected _resolveInitializing: () => void;
    protected _rejectInitializing: () => void;
    protected _pendingEventMap: Map<number, PendingEventMeta>;
    protected _internalPendingEventMap: WeakMap<PendingEventMeta, InternalPendingEventMeta<TResult>>;
    protected _latestCompletedEventHandling: Promise<TResult>;
    protected _eventHandler: BaseEventHandler<T, TResult, TStreamNode>;
    protected _childNodes: Node<any, unknown>[];
    protected _terminateInputEvents: boolean;
    protected _inputConnectionMgr: InputConnectionMgr;
    protected _getStreamNode: () => TStreamNode;

    constructor(
        eventHandler: BaseEventHandler<T, TResult, TStreamNode>,
        inputConnectionMgr: InputConnectionMgr,
        getStreamNode: () => TStreamNode,
        nodeOptions: NodeOptions<TResult>,
        streamOptions: AStreamOptions
    ) {
        this._eventHandler = eventHandler;
        inputConnectionMgr.init(this);
        this._inputConnectionMgr = inputConnectionMgr;
        this._getStreamNode = getStreamNode;
        this._terminateInputEvents = nodeOptions.terminateInputEvents;
        this._terminateInputEvents ??= false;
        this.streamOptions = streamOptions;

        this.acceptingEvents = new Promise((resolve, reject) => {
            this.rejectAcceptingEventsPromise = reject;
        });

        this._childNodes = [];

        if (nodeOptions.initialValue !== undefined) {
            //TODO: encapsulate synchronously setting node value in a function and reuse it here and in _setupOutputEvent()
            this.value = nodeOptions.initialValue;
            this.status = 'success';
            this._latestCompletedEventHandling = Promise.resolve(nodeOptions.initialValue);
            this._resolveInitializing();
        } else {
            this.status = 'uninitialized';
        }

        this._pendingEventMap = new Map();
        this._internalPendingEventMap = new WeakMap();
    }

    async disconnect(): Promise<void> {
        this._inputConnectionMgr.disconnect();
        await Promise.all(this._childNodes.map((node) => {
            return node.disconnect();
        }));
        this.rejectAcceptingEventsPromise(new CanceledAStreamEvent(
            CanceledAStreamEventReason.StreamEnded,
            'Stream ended by call to disconnect()'
        ));

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
        eventId: number,
        parentStreamNode: any,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined {
        this._onOutputEventStart(eventId, parentStreamNode);

        const eventHandling = this._setupInputEventHandling(parentHandling, eventId, parentStreamNode);

        let resultFromChildren = undefined;
        if (this._terminateInputEvents === false) {
            resultFromChildren = this._setupOutputEvent(eventHandling, initiatorNode, eventId, runOptions);
        }

        if (this === initiatorNode as any) {
            return <any>eventHandling
                .catch((reason) => {
                    if (runOptions.ignoreCanceledEvents === true && reason instanceof CanceledAStreamEvent) {
                        return new Promise(() => {});
                    } else {
                        return eventHandling;
                    }
                });
        } else {
            return resultFromChildren;
        }
    }

    connectChild<TChildResult>(node: Node<any, TChildResult>, addChildOptions: Required<AddChildOptions>) {
        this._childNodes.push(node);

        if (addChildOptions.ignoreInitialParentState === false) {
            this._sendCurrentState(node);
        }

        if (this._terminateInputEvents === false) {
            this._sendPendingEvents(node);
        }
    }

    protected _sendCurrentState<TChildResult>(childNode: Node<TResult, TChildResult>): Promise<unknown> {
        if (this._latestCompletedEventHandling && this.status !== 'uninitialized') {
            return childNode.runNode(this._latestCompletedEventHandling, null, generateNextId(), this._getStreamNode(), new RunOptions())
        }
    }

    protected _sendPendingEvents<TChildResult>(childNode: Node<TResult, TChildResult>) {
        for (let [eventId, pendingEventMeta] of this._pendingEventMap) {
            const eventHandling = this._internalPendingEventMap.get(pendingEventMeta).eventHandling;
            childNode.runNode(eventHandling, null, generateNextId(), this._getStreamNode(), new RunOptions());
        }
    }

    protected _setupInputEventHandling<TInitiatorResult>(
        parentHandling: Promise<T>,
        eventId: number,
        parentStreamNode: any
    ): Promise<TResult> {
        const getEventHandlerContext = (): EventHandlerContext<TResult, TStreamNode> => {
            return {
                eventId,
                sequenceId: this._pendingEventMap.get(eventId).sequenceId,
                pendingEventsMap: new Map(this._pendingEventMap),
                streamNode: this._getStreamNode(),
                parentStreamNode
            };
        };

        const newerEventsPending = new Promise<TResult>((resolve, reject) => {
            let pendingEvent = this._pendingEventMap.get(eventId);
            this._internalPendingEventMap.get(pendingEvent).rejectAsObsolete = () => {
                let canceledEvent = new CanceledAStreamEvent(CanceledAStreamEventReason.Obsolete, 'Event rejected because a newer event has already resolved.');
                reject(canceledEvent);
            };
        })

        const eventHandlingTrigger = Promise.race([
            this._eventHandler.setupEventHandlingTrigger(parentHandling, getEventHandlerContext()),
            this.acceptingEvents
        ]);

        const eventHandling = eventHandlingTrigger
            .finally(() => {
                this._pendingEventMap.get(eventId).sequenceId = this._nextSequenceId++;
            })
            .then(
                (result) => {
                    return this._eventHandler.handleFulfilledEvent(result, getEventHandlerContext());
                },
                (reason) => {
                    if (reason instanceof CanceledAStreamEvent) {
                        return this._eventHandler.handleAStreamError(reason, getEventHandlerContext());
                    } else {
                        return this._eventHandler.handleRejectedEvent(reason, getEventHandlerContext());
                    }
                }
            );

        return Promise.race([eventHandling, newerEventsPending]);
    }

    protected _onOutputEventStart(eventId: number, parentStreamNode: any) {
        let pendingEvent = {eventId, sourceTimestamp: Date.now(), parentStreamNode};
        this._pendingEventMap.set(eventId, pendingEvent);
        this._internalPendingEventMap.set(pendingEvent, {});
    }

    protected _setupOutputEvent<TInitiatorResult>(
        eventHandling: Promise<TResult>,
        initiatorNode: Node<unknown, TInitiatorResult>,
        eventId: number,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined {
        const pendingEvent = this._pendingEventMap.get(eventId);
        this._internalPendingEventMap.get(pendingEvent).eventHandling = eventHandling;

        const rejectObsoleteEvents = () => {
            let completedEvent = this._pendingEventMap.get(eventId);
            for (let [eventId, pendingEventMeta] of this._pendingEventMap) {
                if (
                    pendingEventMeta.sequenceId !== undefined &&
                    completedEvent.sequenceId > pendingEventMeta.sequenceId &&
                    completedEvent.parentStreamNode === pendingEventMeta.parentStreamNode
                ) {
                    this._internalPendingEventMap.get(pendingEventMeta).rejectAsObsolete();
                }
            }
        }

        eventHandling
            .then(
                (value: TResult) => {
                    rejectObsoleteEvents();

                    this._pendingEventMap.delete(eventId);

                    this._latestCompletedEventHandling = eventHandling;
                    this.status = 'success';
                    this.value = value;
                    this.error = undefined;
                },
                (reason) => {
                    if ((reason instanceof CanceledAStreamEvent) === false) {
                        rejectObsoleteEvents();
                    }

                    this._pendingEventMap.delete(eventId);

                    if ((reason instanceof CanceledAStreamEvent) === false) {
                        this.status = 'error';
                        this.error = reason;
                        this.value = undefined;
                    }
                }
            )
            // if it is already resolved this will have no effect
            .finally(() => this._resolveInitializing());

        return this._runDownStream(eventHandling, initiatorNode, eventId, runOptions);
    }

    // Runs downstream nodes. If initiatorStream is a child of this stream then returns a promise that resolves with
    // the result of the initiator stream. Otherwise returns undefined.
    protected _runDownStream<TInitiatorResult>(
        nodeHandling: Promise<TResult>,
        initiatorNode: Node<unknown, TInitiatorResult>,
        eventId: number,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined {
        return this._childNodes
            .map(stream => {
                return stream.runNode(nodeHandling, initiatorNode, eventId, this._getStreamNode(), runOptions)
            })
            .reduce((acc, e) => acc || e, undefined);
    }
}
