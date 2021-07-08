import {Node} from './node';

export interface InputConnectionMgr {
    readonly connected;
    disconnect(): void;

    init(node: Node<any, any>);
}
