import {AStream} from './a-stream';
import {BaseNode} from './base-node';
import {BaseEventHandler} from '../event-handlers/base-event-handler';


declare module './base-node' {
    export interface BaseNode<T, TResult, SourceParams extends any[]> {
        addChild<TChildResult>(
            childEventHandler: BaseEventHandler<TResult, TChildResult>
        ): BaseNode<TResult, TChildResult, SourceParams>;
    }
}

BaseNode.prototype.addChild = function <T, TResult, TChildResult, SourceParams extends any[]>(
    this: BaseNode<T, TResult, SourceParams>,
    childEventHandler: BaseEventHandler<TResult, TChildResult>
): BaseNode<TResult, TChildResult, SourceParams> {
    const childNode = new ChildNode({parentStream: this, eventHandler: childEventHandler});
    //TODO: check for readonly
    this._nextStreams.push(childNode);
    return childNode;
}

export interface ChildNodeOptions<T, TResult, SourceParams extends any[]> {
    parentStream: BaseNode<any, T, SourceParams>;
    eventHandler: BaseEventHandler<T, TResult>;
}

export class ChildNode<T, TResult = T, SourceParams extends any[] = [T]> extends BaseNode<T, TResult, SourceParams> {
    _parentStream: BaseNode<any, T, SourceParams>;

    get _sourceStream(): AStream<SourceParams, unknown> {
        return this._parentStream._sourceStream;
    }

    constructor(
        options: ChildNodeOptions<T, TResult, SourceParams>,
    ) {
        super(options);

        this._parentStream = options.parentStream;
    }

    async disconnectNode(): Promise<void> {
        this._parentStream.removeChildNode(this);
        return super.disconnectNode();
    }
}
