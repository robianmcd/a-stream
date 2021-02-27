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
    let childNode = new ChildNode({parentStream: this, eventHandler: childEventHandler});
    if (this.readonly) {
        // this is a bit hacky as it means this function doesn't necessarily return a BaseNode. but this will only run
        // if addChild is called on a ReadableNode which specifies the return type as another ReadableNode
        childNode = <ChildNode<TResult, TChildResult, SourceParams>>childNode.asReadonly();
    }
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

    get connected() { return this._parentStream.connected && this._parentStream.connectedToChildNode(this)};

    constructor(
        options: ChildNodeOptions<T, TResult, SourceParams>,
    ) {
        super(options);

        this._parentStream = options.parentStream;
    }

    async disconnect(): Promise<void> {
        this._parentStream.disconnectDownstream(this);
        return super.disconnect();
    }
}
