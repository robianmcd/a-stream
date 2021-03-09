import {InputConnectionMgr} from './input-connection-mgr.interface';
import {Node} from './node';

export class ParentInputConnectionMgr implements InputConnectionMgr {
    protected node: Node<any, any>;

    constructor(private _parentNode: Node<any, any>) {

    }

    init(node: Node<any, any>) {
        this.node = node;
    }

    get connected() { return this._parentNode.connected && this._parentNode.connectedToChildNode(this.node) };

    disconnect(): void {
        this._parentNode._removeChildNode(this.node);
    }

}
