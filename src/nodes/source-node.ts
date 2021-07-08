import {Node, NodeOptions} from './node';
import type {AStreamOptions} from '../streams/a-stream';
import {RunOptions} from '../streams/run-options';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {InputConnectionMgr} from './input-connection-mgr.interface';
import {generateNextId} from '../event-id-issuer';

export class SourceNode<T, TResult, TStreamNode = unknown> extends Node<T, TResult, TStreamNode> {
    constructor(
        eventHandler: BaseEventHandler<T, TResult, any>,
        inputConnectionMgr: InputConnectionMgr,
        getStreamNode: () => TStreamNode,
        nodeOptions: NodeOptions<TResult>,
        streamOptions: AStreamOptions
    ) {
        super(eventHandler, inputConnectionMgr, getStreamNode, nodeOptions, streamOptions);
    }

    async runSource<TInitiatorResult>(
        value: T, initiator: Node<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        return this.runNode(Promise.resolve(value), initiator, generateNextId(), null, runOptions);
    }

    async sendOutputEvent<TInitiatorResult>(
        result: TResult, initiator: Node<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        //TODO: do we need to race this against acceptingEvents Promise (here or in _setupOutputEvent)?
        let eventId = generateNextId();
        this._onOutputEventStart(eventId,null);
        return this._setupOutputEvent(Promise.resolve(result), initiator, eventId, runOptions);
    }


}
