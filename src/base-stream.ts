import {CanceledAStreamError} from './errors/canceled-a-stream-error';
import {InvalidAStreamError} from './errors/invalid-a-stream-error';

export interface BaseStreamOptions<SourceP extends any[]> {
    sourceStream?: BaseStream<SourceP, any>;
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

        if (options.sourceStream) {
            this._self._sourceStream = options.sourceStream;
        } else {
            this._self._sourceStream = <any>this._self;
        }

        if (options.parentStream) {
            this._self._parentStream = options.parentStream;
        }

        this._self._nextStreams = [];


        return this._self;
    }

    run(...args: SourceP): Promise<T> {
        if (this.isCanceled) {
            return this.runningPromise;
        } else {
            //TODO: Promise.race with isCanceled promise
            return Promise.race([
                this.runningPromise,
                this._sourceStream._runSegment(args, this)
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

    abstract _runSegment<ReturnT>(args: P, returnForStream: BaseStream<unknown[], ReturnT, SourceP>): Promise<ReturnT | undefined>

    //Runs downstream AStreams. When `returnForStream` is found, it's children are no longer awaited and the
    // result will be returned immediately. However siblings of `returnForStream` will be awaited
    // TODO: prevent waiting on siblings with Promise.race()
    // TODO: add error handling
    protected async _runDownStream<ReturnT>(input, returnForStream: BaseStream<unknown[], ReturnT, SourceP>) {
        const runDownStreamPromises = Promise.all(
            this._nextStreams.map(stream => stream._runSegment([input], returnForStream))
        );

        if (this === returnForStream as any) {
            return input as any;
        } else {
            return (await runDownStreamPromises)
                .reduce((acc, returnValue) => acc || returnValue, undefined);
        }
    }
}

export interface BaseStream<P extends any[], T, SourceP extends any[] = P> {
    (...args: P): Promise<T>;
    // debounce<T, SourceP extends any[]>(durationMs: number): DebounceStream<T, SourceP>;
}
