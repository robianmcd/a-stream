import {Node} from './node';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import type {AStreamOptions} from '../streams/a-stream';
import {RunOptions} from '../streams/run-options';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export class SourceNode<Params extends any[], TResult> extends Node<Params, TResult> {
    private _nextSequenceId;
    private _connected;

    get connected(): boolean { return this._connected; }

    constructor(
        eventHandler: BaseEventHandler<Params, TResult>,
        options: AStreamOptions
    ) {
        super(eventHandler, options);

        this._connected = true;
        this._nextSequenceId = 0;
    }

    async disconnect(): Promise<void> {
        this._connected = false;
        return super.disconnect();
    }

    async runSource<TInitiatorResult>(
        args: Params, initiator: Node<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        return this._runNode(Promise.resolve(args), initiator, this._nextSequenceId++, runOptions)
    }
}
