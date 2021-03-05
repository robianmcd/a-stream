import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {Node} from './node';
import {AStreamOptions} from '../streams/a-stream';


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
    let childNode = new ChildNode(childEventHandler, this, this.options);
    this._childNodes.push(childNode);
    return childNode;
}

export class ChildNode<T, TResult = T> extends Node<T, TResult> {
    _parentNode: Node<any, T>;

    get connected() { return this._parentNode.connected && this._parentNode.connectedToChildNode(this)};

    constructor(eventHandler: BaseEventHandler<T, TResult>, parentNode: Node<any, T>, options: AStreamOptions) {
        super(eventHandler, options);

        this._parentNode = parentNode;
    }

    async disconnect(): Promise<void> {
        this._parentNode._removeChildNode(this);
        return super.disconnect();
    }
}
