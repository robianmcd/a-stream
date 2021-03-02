import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {Node} from './node';


declare module './node' {
    export interface Node<T, TResult> {
        addChild<TChildResult>(
            childEventHandler: BaseEventHandler<TResult, TChildResult>
        ): Node<TResult, TChildResult>;
    }
}

Node.prototype.addChild = function <T, TResult, TChildResult>(
    this: Node<T, TResult>,
    childEventHandler: BaseEventHandler<TResult, TChildResult>
): Node<TResult, TChildResult> {
    let childNode = new ChildNode({parentNode: this, eventHandler: childEventHandler});
    this._childNodes.push(childNode);
    return childNode;
}

export interface ChildNodeOptions<T, TResult> {
    parentNode: Node<any, T>;
    eventHandler: BaseEventHandler<T, TResult>;
}

export class ChildNode<T, TResult = T> extends Node<T, TResult> {
    _parentNode: Node<any, T>;

    get connected() { return this._parentNode.connected && this._parentNode.connectedToChildNode(this)};

    constructor(
        options: ChildNodeOptions<T, TResult>,
    ) {
        super({eventHandler: options.eventHandler});

        this._parentNode = options.parentNode;
    }

    async disconnect(): Promise<void> {
        this._parentNode._removeChildNode(this);
        return super.disconnect();
    }
}
