import {Node, NodeOptions} from './node';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamOptions {

}


export class SourceNode<Params extends any[], TResult> extends Node<Params, TResult> {
    private _nextSequenceId;
    private _connected;

    get connected(): boolean { return this._connected; }

    constructor(
        options: NodeOptions<Params, TResult>,
    ) {
        super(options);

        this._connected = true;
        this._nextSequenceId = 0;
    }

    async disconnect(): Promise<void> {
        this._connected = false;
        return super.disconnect();
    }

    async runSource<TInitiatorResult>(
        args: Params, initiator: Node<unknown, TInitiatorResult>
    ): Promise<TInitiatorResult> {
        return this._runNode(Promise.resolve(args), initiator, this._nextSequenceId++)
    }
}
