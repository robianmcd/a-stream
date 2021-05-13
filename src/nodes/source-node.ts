import {Node, NodeOptions} from './node';
import type {AStreamOptions} from '../streams/base-a-stream';
import {RunOptions} from '../streams/run-options';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {InputConnectionMgr} from './input-connection-mgr.interface';

export class SourceNode<T, TResult, TStreamNode = unknown> extends Node<T, TResult, TStreamNode> {
    private _nextSequenceId: number;

    constructor(
        eventHandler: BaseEventHandler<T, TResult, any>,
        inputConnectionMgr: InputConnectionMgr,
        getStreamNode: () => TStreamNode,
        nodeOptions: NodeOptions<TResult>,
        streamOptions: AStreamOptions
    ) {
        super(eventHandler, inputConnectionMgr, getStreamNode, nodeOptions, streamOptions);

        this._nextSequenceId = 0;
    }

    async runSource<TInitiatorResult>(
        value: T, initiator: Node<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        return this.runNode(Promise.resolve(value), initiator, this._nextSequenceId++, runOptions);
    }

    async sendOutputEvent<TInitiatorResult>(
        result: TResult, initiator: Node<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        //TODO: do we need to race this against acceptingEvents Promise (here or in _setupOutputEvent)?
        const sequenceId = this._nextSequenceId++;
        this._onOutputEventStart(sequenceId);
        return this._setupOutputEvent(Promise.resolve(result), initiator, sequenceId, runOptions);
    }


}
