import {BaseStream, Executor, SegmentRunner} from './base-stream';

declare module './base-stream' {
    export interface BaseStream<P extends any[], T, SourceP extends any[]> {
        next<NextT>(
            executor: Executor<[T], NextT>
        ): BaseStream<[T], NextT, SourceP>;
    }
}

BaseStream.prototype.next = function next<NextT, P extends any[], T, SourceP extends any[]>(
    this: BaseStream<P, T, SourceP>,
    executor: Executor<[T], NextT>
): AStream<[T], NextT, SourceP> {
    const nextStream = new AStream<[T], NextT, SourceP>(executor, this._sourceRunSegment);
    this._nextSegmentRunners.push(nextStream._runSegment.bind(nextStream));
    return nextStream;
};


export class AStream<P extends any[], T, SourceP extends any[] = P> extends BaseStream<P, T, SourceP> {
    protected _executor: Executor<P, T>;

    constructor(
        executor?: Executor<P, T>,
        sourceRunSegment?: SegmentRunner<SourceP, unknown>,
    ) {
        super(sourceRunSegment);

        if (!executor) {
            // @ts-ignore
            executor = x => x;
        }

        this._executor = executor;
    }

    async _runSegment<ReturnT>(args: P, returnForStream: BaseStream<unknown[], ReturnT, SourceP>): Promise<ReturnT | undefined> {
        //TODO: wrap in try catch
        let result = await this._executor(...args);

        return this._runDownStream(result, returnForStream);
    }
}
