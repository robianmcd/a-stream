import {BaseEventHandler} from './base-event-handler';
import {BaseEventNode} from '../nodes/base-event-node';

export class BaseAdapterEventHandler<T, TResult, TStreamNode> extends BaseEventHandler<T, TResult, TStreamNode> {
    protected sourceNode: BaseEventNode<T, TResult, TStreamNode>;

    init(sourceNode: BaseEventNode<T, TResult, TStreamNode>) {
        this.sourceNode = sourceNode;
    }
}
