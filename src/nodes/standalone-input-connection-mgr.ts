import {InputConnectionMgr} from './input-connection-mgr.interface';
import {BaseEventNode} from './base-event-node';

export class StandaloneInputConnectionMgr implements InputConnectionMgr {
    private _connected = true;


    constructor() {

    }

    init(node: BaseEventNode<any, any>) {

    }

    get connected(): boolean { return this._connected; }

    disconnect(): void {
        this._connected = false;
    }

}
