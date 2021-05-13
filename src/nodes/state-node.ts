import {Node, NodeOptions} from './node';
import type {AStreamOptions} from '../streams/base-a-stream';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {InputConnectionMgr} from './input-connection-mgr.interface';

export class StateNode<T, TResult, TStreamNode = unknown> extends Node<T, TResult, TStreamNode> {
    constructor(
        eventHandler: BaseEventHandler<T, TResult, any>,
        inputConnectionMgr: InputConnectionMgr,
        getStreamNode: () => TStreamNode,
        nodeOptions: NodeOptions<TResult>,
        streamOptions: AStreamOptions
    ) {
        super(eventHandler, inputConnectionMgr, getStreamNode, nodeOptions, streamOptions);
    }
}
