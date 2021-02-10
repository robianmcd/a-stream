import {CanceledAStreamError} from '../errors/canceled-a-stream-error';
import {AStreamError} from '../errors/a-stream-error';
import {AStream} from './a-stream';
import type {ChildNode} from './child-node';

export interface BaseNodeOptions<T, SourceParams extends any[]> {

}

export abstract class BaseNode<T, TResult = T, SourceParams extends any[] = [T]> extends Function {
    runningPromise: Promise<any>;
    isCanceled = false;
    isPending = false; // TODO: implement

    status: 'success' | 'error' | 'uninitialized' = 'uninitialized';
    value: TResult;
    error: any;

    protected _lastCompletedSequenceId;

    _nextStreams: ChildNode<TResult, unknown, SourceParams>[];
    _rejectRunningPromise: (reason: CanceledAStreamError) => void;
    _self: BaseNode<T, TResult, SourceParams>;

    abstract get _sourceStream(): AStream<SourceParams, unknown>;

    protected constructor(
        options: BaseNodeOptions<T, SourceParams> = {},
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self = this.bind(this);

        this._self.runningPromise = new Promise((resolve, reject) => {
            this._self._rejectRunningPromise = reject;
        });

        this._self._nextStreams = [];
        this._self.status = 'uninitialized';
        this._self._lastCompletedSequenceId = -1;

        return this._self;
    }

    hasValue(): boolean { return this.status === 'success' }
    hasError(): boolean { return this.status === 'error' }
    isInitialized(): boolean { return this.status !== 'uninitialized' }

    run(...args: SourceParams): Promise<TResult> {
        if (this.isCanceled) {
            return this.runningPromise;
        } else {
            return Promise.race([
                this.runningPromise,
                this._sourceStream._runSource(args, this)
            ]);
        }
    }

    _runNode<TInitiatorResult>(
        parentHandling: Promise<T>,
        initiatorStream: BaseNode<unknown, TInitiatorResult, SourceParams>,
        sequenceId: number
    ): Promise<TInitiatorResult> | undefined {
        const nodeHandling = parentHandling
            .then(
                (result) => {
                    return this._handleFulfilledEvent(result, sequenceId);
                },
                (reason) => {
                    return this._handleRejectedEvent(reason, sequenceId);
                }
            );

        nodeHandling
            .then(
                (value: TResult) => {
                    if (this._lastCompletedSequenceId < sequenceId) {
                        this._lastCompletedSequenceId = sequenceId;
                        this.status = 'success';
                        this.value = value;
                        this.error = undefined;
                    }
                },
                (reason) => {
                    if (
                        this._lastCompletedSequenceId < sequenceId &&
                        (reason instanceof AStreamError) === false
                    ) {
                        this._lastCompletedSequenceId = sequenceId;
                        this.status = 'error';
                        this.error = reason;
                        this.value = undefined;
                    }
                }
            );

        const runDownStreamPromise = this._runDownStream(nodeHandling, initiatorStream, sequenceId);

        if (this === initiatorStream as any) {
            return <any>nodeHandling;
        } else {
            return runDownStreamPromise;
        }
    }

    _handleFulfilledEvent(value: T, sequenceId: number): Promise<TResult> {
        return Promise.resolve(<any>value);
    }

    _handleRejectedEvent(reason, sequenceId: number): Promise<TResult> {
        return Promise.reject(reason);
    }

    // Runs downstream nodes. If initiatorStream is a child of this stream then returns a promise that resolves with
    // the result of the initiator stream. Otherwise returns undefined.
    protected _runDownStream<TInitiatorResult>(
        nodeHandling: Promise<TResult>,
        initiatorStream: BaseNode<unknown, TInitiatorResult, SourceParams>,
        sequenceId: number
    ): Promise<TInitiatorResult> | undefined {
        return this._nextStreams
            .map(stream => {
                return stream._runNode(nodeHandling, initiatorStream, sequenceId)
            })
            .reduce((acc, e) => acc || e, undefined);
    }
}

export interface BaseStreamNode<T, TResult, SourceParams extends any[] = [T]> {
    (...args: SourceParams): Promise<TResult>;
}
