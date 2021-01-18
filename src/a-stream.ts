interface Executor<P extends any[], T> {
    (...args: P): Promise<T> | T
}

interface SegmentRunner<P, T> {
    <T>(args: P, returnForStream: AStream<any[], T>): Promise<T|undefined>;
}

export class AStream<P extends any[], T, SourceP extends any[] = P> extends Function {
    executor: Executor<P, T>;
    _sourceRunSegment: SegmentRunner<SourceP, unknown>;
    _nextSegmentRunners: SegmentRunner<[T], unknown>[];
    _self;

    constructor(
        executor?: Executor<P, T>,
        sourceRunSegment?: SegmentRunner<SourceP, unknown>,
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        this._self = this.bind(this);

        if (!executor) {
            // @ts-ignore
            executor = x => x;
        }

        if (!sourceRunSegment) {
            sourceRunSegment = this._self._runSegment.bind(this._self);
        }

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self.executor = executor;
        this._self._sourceRunSegment = sourceRunSegment;
        this._self._nextSegmentRunners = [];


        return this._self;
    }

    next<NextT>(executor: { (input: T): Promise<NextT> | NextT }): AStream<[T], NextT, SourceP> {
        const nextStream = new AStream<[T], NextT, SourceP>(executor, this._sourceRunSegment);
        this._nextSegmentRunners.push(nextStream._runSegment.bind(nextStream));
        return nextStream;
    }

    debounce(durationMs: number = 200) {
        // let stream = new AStream();
        // stream
    }

    run(...args: SourceP): Promise<T> {
        return this._sourceRunSegment(args, this);
    }

    private async _runSegment<ReturnT>(args: P, returnForStream: AStream<unknown[], ReturnT, SourceP>): Promise<ReturnT | undefined> {
        //TODO: wrap in try catch
        let result = await this.executor(...args);

        const returnValueFromChildren = this._nextSegmentRunners
            .map(segmentRunner => segmentRunner([result], returnForStream))
            .reduce((acc, returnValue) => acc || returnValue, undefined);

        if (this === returnForStream as any) {
            return result as any;
        } else {
            return returnValueFromChildren;
        }
    }
}

export interface AStream<P extends any[], T> {
    (...args: P): T;
}
