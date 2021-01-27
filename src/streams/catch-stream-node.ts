import {BaseStreamNode, BaseStreamOptions} from './base-stream-node';

export interface RejectedExecutor<TResult> {
    (reason: any): Promise<TResult> | TResult
}

declare module './base-stream-node' {
    export interface BaseStreamNode<T, TResult, SourceParams extends any[]> {
        catch(
            rejectedEventHandler: RejectedExecutor<TResult>
        ): CatchStreamNode<TResult, SourceParams>;
    }
}

BaseStreamNode.prototype.catch = function <T, TResult, SourceParams extends any[]>(
    this: BaseStreamNode<T, TResult, SourceParams>,
    rejectedEventHandler: RejectedExecutor<TResult>
): CatchStreamNode<TResult, SourceParams> {
    const nextStream = new CatchStreamNode<TResult, SourceParams>(rejectedEventHandler, {
        parentStream: this
    });
    this._nextStreams.push(nextStream);

    return nextStream;
};

export interface CatchStreamOptions<T, SourceParams extends any[]> extends BaseStreamOptions<T, SourceParams> {

}


export class CatchStreamNode<TResult, SourceParams extends any[]> extends BaseStreamNode<TResult, TResult, SourceParams> {
    protected _rejectedEventHandler: (value: any) => Promise<TResult> | TResult;

    constructor(
        rejectedEventHandler?: RejectedExecutor<TResult>,
        options: CatchStreamOptions<TResult, SourceParams> = {},
    ) {
        super(options);

        if (!rejectedEventHandler) {
            // @ts-ignore
            rejectedEventHandler = x => x;
        }

        this._rejectedEventHandler = rejectedEventHandler;
    }

    async _handleRejectedEvent(reason): Promise<TResult> {
        return await this._rejectedEventHandler(reason);
    }
}
