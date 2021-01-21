export interface Executor<P extends any[], T> {
    (...args: P): Promise<T> | T
}

export interface SegmentRunner<P, T> {
    <T>(args: P, returnForStream: BaseStream<any[], T>): Promise<T | undefined>;
}

export abstract class BaseStream<P extends any[], T, SourceP extends any[] = P> extends Function {
    _sourceRunSegment: SegmentRunner<SourceP, unknown>;
    _nextSegmentRunners: SegmentRunner<[T], unknown>[];
    _self;

    constructor(
        sourceRunSegment?: SegmentRunner<SourceP, unknown>,
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        this._self = this.bind(this);

        if (!sourceRunSegment) {
            sourceRunSegment = this._self._runSegment.bind(this._self);
        }

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self._sourceRunSegment = sourceRunSegment;
        this._self._nextSegmentRunners = [];


        return this._self;
    }

    run(...args: SourceP): Promise<T> {
        return this._sourceRunSegment(args, this);
    }

    abstract _runSegment<ReturnT>(args: P, returnForStream: BaseStream<unknown[], ReturnT, SourceP>): Promise<ReturnT | undefined>

    //Runs downstream AStreams. When `returnForStream` is found, it's children are no longer awaited and the
    // result will be returned immediately. However siblings of `returnForStream` will be awaited
    // TODO: prevent waiting on siblings with Promise.race()
    // TODO: add error handling
    protected async _runDownStream<ReturnT>(input, returnForStream: BaseStream<unknown[], ReturnT, SourceP>) {
        const runDownStreamPromises = Promise.all(
            this._nextSegmentRunners.map(segmentRunner => segmentRunner([input], returnForStream))
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
