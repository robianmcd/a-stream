import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {NodeInternals} from './node-internals';


declare module './node-internals' {
    export interface NodeInternals<T, TResult> {
        addChild<TChildResult>(
            childEventHandler: BaseEventHandler<TResult, TChildResult>
        ): NodeInternals<TResult, TChildResult>;
    }
}

NodeInternals.prototype.addChild = function <T, TResult, TChildResult>(
    this: NodeInternals<T, TResult>,
    childEventHandler: BaseEventHandler<TResult, TChildResult>
): NodeInternals<TResult, TChildResult> {
    let childNode = new ChildNodeInternals({parentNodeInternals: this, eventHandler: childEventHandler});
    this._nextStreams.push(childNode);
    return childNode;
}

export interface ChildNodeInternalsOptions<T, TResult> {
    parentNodeInternals: NodeInternals<any, T>;
    eventHandler: BaseEventHandler<T, TResult>;
}

export class ChildNodeInternals<T, TResult = T> extends NodeInternals<T, TResult> {
    _parentNodeInternals: NodeInternals<any, T>;

    get connected() { return this._parentNodeInternals.connected && this._parentNodeInternals.connectedToChildNode(this)};

    constructor(
        options: ChildNodeInternalsOptions<T, TResult>,
    ) {
        super({eventHandler: options.eventHandler});

        this._parentNodeInternals = options.parentNodeInternals;
    }

    async disconnect(): Promise<void> {
        this._parentNodeInternals.disconnectDownstream(this);
        return super.disconnect();
    }
}
