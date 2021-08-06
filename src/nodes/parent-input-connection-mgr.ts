import {InputConnectionMgr} from './input-connection-mgr.interface';
import {BaseEventNode} from './base-event-node';

export class ParentInputConnectionMgr implements InputConnectionMgr {
    protected node: BaseEventNode<any, any>;

    constructor(private _parentNodes: BaseEventNode<any, any>[]) {

    }

    init(node: BaseEventNode<any, any>) {
        this.node = node;
    }

    get connected() {
        return this._parentNodes.some(parent => parent.connected && parent.connectedToChildNode(this.node));
    };

    disconnect(): void {
        this._parentNodes.forEach(parent => parent.connectedToChildNode(this.node) && parent._removeChildNode(this.node));
    }

}
