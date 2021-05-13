import {BaseAStream} from './base-a-stream';
import {SourceNode} from '../nodes/source-node';
import {Node} from '../nodes/node';


export class BaseEventStream<T, TResult, SourceParams extends any[]> extends BaseAStream<T, TResult, SourceParams> {
    constructor(
        node: Node<T, TResult>,
        sourceNode: SourceNode<SourceParams, any>
    ) {
        super(node, sourceNode);
    }

    protected _createChildStream(childNode) {
        return new BaseEventStream(
            childNode,
            this._sourceNode
        );
    }
}
