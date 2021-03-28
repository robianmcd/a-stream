import {BaseEventHandler} from './base-event-handler';
import {SourceNode} from '../nodes/source-node';

export class BaseAdapterEventHandler<T, TResult> extends BaseEventHandler<T, TResult> {
    protected sourceNode: SourceNode<T, TResult>;

    init(sourceNode: SourceNode<T, TResult>) {
        this.sourceNode = sourceNode;
    }
}
