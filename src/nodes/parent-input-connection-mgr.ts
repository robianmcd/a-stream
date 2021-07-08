import {InputConnectionMgr} from './input-connection-mgr.interface';
import {Node} from './node';

export class ParentInputConnectionMgr implements InputConnectionMgr {
    protected node: Node<any, any>;

    constructor(private _parentNodes: Node<any, any>[]) {

    }

    init(node: Node<any, any>) {
        this.node = node;
    }

    get connected() {
        return this._parentNodes.some(parent => parent.connected && parent.connectedToChildNode(this.node));
    };

    disconnect(): void {
        this._parentNodes.forEach(parent => parent.connectedToChildNode(this.node) && parent._removeChildNode(this.node));
    }

}
