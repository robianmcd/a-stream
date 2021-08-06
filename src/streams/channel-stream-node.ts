import {BaseAStreamNode} from './base-a-stream-node';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {InputConnectionMgr} from '../nodes/input-connection-mgr.interface';
import {BaseEventNode, NodeOptions} from '../nodes/base-event-node';
import {AStreamOptions} from './state-stream';

export class ChannelStreamNode<T, TResult, SourceParams extends any[]> extends BaseAStreamNode<T, TResult, SourceParams> {
    protected _createChildStreamNode(childNode): BaseAStreamNode<any, any, SourceParams> {
        return undefined;
    }
    protected _createChildEventNode<TChildResult>(
        eventHandler: BaseEventHandler<any, TChildResult, any>,
        inputConnectionMgr: InputConnectionMgr, getStreamNode: () => any,
        nodeOptions: NodeOptions<TChildResult>,
        streamOptions: AStreamOptions
    ): BaseEventNode<TResult, TChildResult, SourceParams> {
        return undefined;
    }

}
