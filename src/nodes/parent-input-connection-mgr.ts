import {InputConnectionMgr} from './input-connection-mgr.interface';
import {Node} from './node';

export class ParentInputConnectionMgr implements InputConnectionMgr {
    protected node: Node<any, any>;

    //Combine TODO: take array of parent nodes
    // How do sequence IDs work for non primary nodes?
    // What to use for sequence IDs? Can we just start new sequence IDs. If events come in out of order this will reorder them... but maybe that's ok?
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

    //combine TODO: remove this after resequencing changes
    getInitialSequenceId(): number {
        if(this._parentNodes[0]._latestCompletedSequenceId > 0) {
          return -1;
        } else {
            // This is needed to support initialValue option. If parent sends down initial value with sequence id of -1
            // then child nodes _latestCompletedSequenceId needs to start at -2 for the parent event to be fully processed
            return this._parentNodes[0]._latestCompletedSequenceId - 1;
        }
    }

}
