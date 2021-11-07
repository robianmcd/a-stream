import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {CanceledAStreamEvent} from '../errors/canceled-a-stream-event';
import {RunOptions} from '../streams/run-options';
import {InputConnectionMgr} from './input-connection-mgr.interface';

import type {AStreamOptions} from '../streams/state-stream';
import {generateNextId} from '../event-id-issuer';

export interface NodeOptions<TResult> {
    terminateInputEvents?: boolean;
    initialValue?: TResult;
}

export interface AddChildOptions {
    ignoreInitialParentState?: boolean;
}

export type AddChildNodeOptions<TResult> = NodeOptions<TResult> | AddChildOptions;
export type AddAdapterNodeOptions<TResult> = Omit<AddChildNodeOptions<TResult>, 'terminateInputEvents' | 'ignoreInitialParentState'>;

export abstract class BaseEventNode<T, TResult, TStreamNode = unknown> {
    acceptingEvents: Promise<any>;
    readonly streamOptions: AStreamOptions;

    get connected(): boolean {
        return this._inputConnectionMgr.connected;
    }

    abstract get pending(): boolean;

    rejectAcceptingEventsPromise: (canceledAStreamEvent: CanceledAStreamEvent) => void;

    protected _eventHandler: BaseEventHandler<T, TResult, TStreamNode>;
    protected _childNodes: BaseEventNode<any, unknown>[];
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
        this.streamOptions = streamOptions;

        this.acceptingEvents = new Promise((resolve, reject) => {
            this.rejectAcceptingEventsPromise = reject;
        });

        this._childNodes = [];
    }

    abstract disconnect(): Promise<void>;

    disconnectDownstream(node: BaseEventNode<any, any>): Promise<void> {
        let nodeIndex = this._childNodes.findIndex(n => n.connectedToDownstreamNode(node));
        if (nodeIndex !== -1) {
            return this._childNodes[nodeIndex].disconnect();
        } else {
            throw new Error("Node doesn't exist downstream of parent");
        }
    }

    connectedToChildNode(node: BaseEventNode<any, any>): boolean {
        return this._childNodes.some(n => n === node);
    }

    connectedToDownstreamNode(node: BaseEventNode<any, any>): boolean {
        if (node === this) {
            return true;
        } else if (this.connectedToChildNode(node)) {
            return true;
        } else {
            return this._childNodes.some(s => s.connectedToDownstreamNode(node));
        }
    }

    _removeChildNode(childNode: BaseEventNode<TResult, any>) {
        const childNodeIndex = this._childNodes.findIndex(n => n === childNode);
        if (childNodeIndex !== -1) {
            this._childNodes.splice(childNodeIndex, 1);
        } else {
            throw new Error("Node doesn't exist in parent");
        }
    }

    async sendOutputEvent<TInitiatorResult>(
        result: TResult, initiator: BaseEventNode<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        //TODO: do we need to race this against acceptingEvents Promise (here or in _setupOutputEvent)?
        let eventId = generateNextId();
        this._onOutputEventStart(eventId,null);
        return this._setupOutputEvent(Promise.resolve(result), initiator, eventId, runOptions);
    }

    abstract runNode<TInitiatorResult>(
        parentHandling: Promise<T>,
        initiatorNode: BaseEventNode<unknown, TInitiatorResult>,
        eventId: number,
        parentStreamNode: any,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined;

    abstract connectChild<TChildResult>(node: BaseEventNode<any, TChildResult>, addChildOptions: Required<AddChildOptions>);

    protected abstract _onOutputEventStart(eventId: number, parentStreamNode: any);
    protected abstract _setupOutputEvent<TInitiatorResult>(
        eventHandling: Promise<TResult>,
        initiatorNode: BaseEventNode<unknown, TInitiatorResult>,
        eventId: number,
        runOptions: RunOptions
    ): Promise<TInitiatorResult> | undefined;
}
