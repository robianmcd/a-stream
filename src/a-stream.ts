import {BaseStream, BaseStreamOptions} from './base-stream';

export interface Executor<P extends any[], T> {
    (...args: P): Promise<T> | T
}

declare module './base-stream' {
    export interface BaseStream<P extends any[], T, SourceP extends any[]> {
        next<NextT>(
            executor: Executor<[T], NextT>
        ): AStream<[T], NextT, SourceP>;
    }
}

BaseStream.prototype.next = function next<NextT, P extends any[], T, SourceP extends any[]>(
    this: BaseStream<P, T, SourceP>,
    executor: Executor<[T], NextT>
): AStream<[T], NextT, SourceP> {
    const nextStream = new AStream<[T], NextT, SourceP>(executor, {
        parentStream: <any>this
    });
    this._nextStreams.push(nextStream);

    return nextStream;
};

export interface AStreamOptions<SourceP extends any[]> extends BaseStreamOptions<SourceP> {

}


export class AStream<P extends any[], T, SourceP extends any[] = P> extends BaseStream<P, T, SourceP> {
    protected _executor: Executor<P, T>;

    constructor(
        executor?: Executor<P, T>,
        options: AStreamOptions<SourceP> = {},
    ) {
        super(options);

        if (!executor) {
            // @ts-ignore
            executor = x => x;
        }

        this._executor = executor;
    }

    async _handleFulfilledEvent(args: P) : Promise<T> {
        return await this._executor(...args);
    }
}
