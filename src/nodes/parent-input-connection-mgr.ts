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

    getInitialSequenceId(): number {
        if(this._parentNode._latestCompletedSequenceId > 0) {
          return -1;
        } else {
            // This is needed to support initialValue option. If parent sends down initial value with sequence id of -1
            // then child nodes _latestCompletedSequenceId needs to start at -2 for the parent event to be fully processed
            return this._parentNode._latestCompletedSequenceId - 1;
        }
    }

}
