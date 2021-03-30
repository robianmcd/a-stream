import {BaseEventHandler} from './base-event-handler';
import {SourceNode} from '../nodes/source-node';

export class BaseAdapterEventHandler<T, TResult, TStreamNode> extends BaseEventHandler<T, TResult, TStreamNode> {
    protected sourceNode: SourceNode<T, TResult, TStreamNode>;

    init(sourceNode: SourceNode<T, TResult, TStreamNode>) {
        this.sourceNode = sourceNode;
    }
}
