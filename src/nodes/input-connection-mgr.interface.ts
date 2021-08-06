import {BaseEventNode} from './base-event-node';

export interface InputConnectionMgr {
    readonly connected;
    disconnect(): void;

    init(node: BaseEventNode<any, any>);
}
