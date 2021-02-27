import {BaseNode} from './base-node';
import {CustomEventHandler} from '../event-handlers/custom-event-handler';

export interface SourceExecutor<Params extends any[], TResult> {
    (...args: Params): Promise<TResult> | TResult
}

export interface AStreamOptions {

}


export class AStream<Params extends any[], TResult> extends BaseNode<Params, TResult, Params> {
    private _nextSequenceId;
    private _connected;

    get connected(): boolean { return this._connected; }

    get _sourceStream(): AStream<Params, TResult> {
        return this;
    }

    constructor(
        inputHandler?: SourceExecutor<Params, TResult>,
        options: AStreamOptions = {},
    ) {
        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        const eventHandler = new CustomEventHandler((args: Params) => inputHandler(...args));

        super({eventHandler});

        this._connected = true;
        this._nextSequenceId = 0;
    }

    async disconnect(): Promise<void> {
        this._connected = false;
        return super.disconnect();
    }

    async _runSource<TInitiatorResult>(args: Params, initiator: BaseNode<unknown, TInitiatorResult, Params>) {
        return this._runNode(Promise.resolve(args), initiator, this._nextSequenceId++)
    }
}
