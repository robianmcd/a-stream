import {Node} from './node';

export interface InputConnectionMgr {
    readonly connected;
    disconnect(): void;
    getInitialSequenceId(): number;

    init(node: Node<any, any>);
}
