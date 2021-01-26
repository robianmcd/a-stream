import {BaseStream, BaseStreamOptions} from './base-stream';

export interface Executor<P extends any[], T> {
    (...args: P): Promise<T> | T
}

declare module './base-stream' {
    export interface BaseStream<P extends any[], T, SourceP extends any[]> {
        next<NextT>(
            fulfilledEventHandler: Executor<[T], NextT>
        ): AStream<[T], NextT, SourceP>;
    }
}

BaseStream.prototype.next = function next<NextT, P extends any[], T, SourceP extends any[]>(
    this: BaseStream<P, T, SourceP>,
    fulfilledEventHandler: Executor<[T], NextT>
): AStream<[T], NextT, SourceP> {
    const nextStream = new AStream<[T], NextT, SourceP>(fulfilledEventHandler, {
        parentStream: <any>this
    });
    this._nextStreams.push(nextStream);

    return nextStream;
};

export interface AStreamOptions<SourceP extends any[]> extends BaseStreamOptions<SourceP> {

}


export class AStream<P extends any[], T, SourceP extends any[] = P> extends BaseStream<P, T, SourceP> {
    protected _inputHandler: Executor<P, T>;

    constructor(
        inputHandler?: Executor<P, T>,
        options: AStreamOptions<SourceP> = {},
    ) {
        super(options);

        if (!inputHandler) {
            // @ts-ignore
            inputHandler = x => x;
        }

        this._inputHandler = inputHandler;
    }

    async _handleFulfilledEvent(args: P) : Promise<T> {
        return await this._inputHandler(...args);
    }
}
