import {InputConnectionMgr} from './input-connection-mgr.interface';
import {Node} from './node';

export class StandaloneInputConnectionMgr implements InputConnectionMgr {
    private _connected = true;


    constructor() {

    }

    init(node: Node<any, any>) {

    }

    get connected(): boolean { return this._connected; }

    disconnect(): void {
        this._connected = false;
    }

}
