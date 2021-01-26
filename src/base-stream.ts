import {CanceledAStreamError} from './errors/canceled-a-stream-error';
import {InvalidAStreamError} from './errors/invalid-a-stream-error';

export interface BaseStreamOptions<SourceP extends any[]> {
    parentStream?: BaseStream<SourceP, any>;
}

export abstract class BaseStream<P extends any[], T, SourceP extends any[] = P> extends Function {
    runningPromise: Promise<any>;
    isCanceled = false;
    _sourceStream: BaseStream<SourceP, unknown>;
    _parentStream: BaseStream<any[], P[0]>;
    _nextStreams: BaseStream<[T], unknown, SourceP>[];
    _rejectRunningPromise: (reason: CanceledAStreamError) => void;
    _self: BaseStream<P, T, SourceP>;

    constructor(
        options: BaseStreamOptions<SourceP> = {},
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self = this.bind(this);

        this._self.runningPromise = new Promise((resolve, reject) => {
            this._self._rejectRunningPromise = reject;
        });

        if (options.parentStream) {
            this._self._parentStream = options.parentStream;
            this._self._sourceStream = options.parentStream._sourceStream;
        } else {
            this._self._sourceStream = <any>this._self;
        }

        this._self._nextStreams = [];


        return this._self;
    }

    run(...args: SourceP): Promise<T> {
        if (this.isCanceled) {
            return this.runningPromise;
        } else {
            return Promise.race([
                this.runningPromise,
                this._sourceStream._runNode(Promise.resolve(args), this)
            ]);
        }
    }

    //remove, cancel, end, unsubscribe, destroy
    async remove(): Promise<void> {
        if (!this._parentStream) {
            throw new InvalidAStreamError('Cannot call remove() on a node with no parent.');
        }

        let streamIndex = this._parentStream._nextStreams.findIndex(s => <any>s === this);
        if (streamIndex !== -1) {
            this._parentStream._nextStreams.splice(streamIndex, 1);
        } else {
            throw new Error("Stream doesn't exist in parent");
        }

        await Promise.all(this._nextStreams.map(s => s.remove()));

        this.isCanceled = true;
        this._rejectRunningPromise(new CanceledAStreamError('Stream canceled by call to remove()'));
        return this.runningPromise.catch(reason => {
            if (reason instanceof CanceledAStreamError) {
                return;
            } else {
                return Promise.reject(reason);
            }
        });
    }

    _runNode<TResult>(
        parentHandling: Promise<P>,
        initiatorStream: BaseStream<unknown[], TResult, SourceP>
    ): Promise<TResult> | undefined {
        const nodeHandling = parentHandling
            .then(
                (result) => this._handleFulfilledEvent(result),
                (reason) => this._handleRejectedEvent(reason)
            );

        const runDownStreamPromise = this._runDownStream(nodeHandling, initiatorStream);

        if (this === initiatorStream as any) {
            return <any>nodeHandling;
        } else {
            return runDownStreamPromise;
        }
    }

    _handleFulfilledEvent(args: P): Promise<T> {
        return Promise.resolve(<T>args[0]);
    }

    _handleRejectedEvent(reason): Promise<T> {
        return Promise.reject(reason);
    }

    // Runs downstream nodes. If initiatorStream is a child of this stream then returns a promise that resolves with
    // the result of the initiator stream. Otherwise returns undefined.
    protected _runDownStream<TResult>(
        nodeHandling: Promise<T>,
        initiatorStream: BaseStream<unknown[], TResult, SourceP>
    ): Promise<TResult> | undefined {
        return this._nextStreams
            .map(stream => {
                //TODO: deal with params
                return stream._runNode(nodeHandling.then(e => [e]), initiatorStream)
            })
            .reduce((acc, e) => acc || e, undefined);

    }
}

export interface BaseStream<P extends any[], T, SourceP extends any[]> {
    (...args: P): Promise<T>;
}
