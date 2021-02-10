import {BaseNode} from './base-node';
import {ChildNode, ChildNodeOptions} from './child-node';

export interface RejectedExecutor<TResult> {
    (reason: any): Promise<TResult> | TResult
}

declare module './base-node' {
    export interface BaseNode<T, TResult, SourceParams extends any[]> {
        catch(
            rejectedEventHandler: RejectedExecutor<TResult>
        ): CatchNode<TResult, SourceParams>;
    }
}

BaseNode.prototype.catch = function <T, TResult, SourceParams extends any[]>(
    this: BaseNode<T, TResult, SourceParams>,
    rejectedEventHandler: RejectedExecutor<TResult>
): CatchNode<TResult, SourceParams> {
    const nextStream = new CatchNode<TResult, SourceParams>(rejectedEventHandler, {
        parentStream: this
    });
    this._nextStreams.push(nextStream);

    return nextStream;
};

export interface CatchStreamOptions<T, SourceParams extends any[]> extends ChildNodeOptions<T, SourceParams> {

}


export class CatchNode<TResult, SourceParams extends any[]> extends ChildNode<TResult, TResult, SourceParams> {
    protected _rejectedEventHandler: (value: any) => Promise<TResult> | TResult;

    constructor(
        rejectedEventHandler: RejectedExecutor<TResult>,
        options: CatchStreamOptions<TResult, SourceParams>,
    ) {
        super(options);

        this._rejectedEventHandler = rejectedEventHandler;
    }

    async _handleRejectedEvent(reason): Promise<TResult> {
        return await this._rejectedEventHandler(reason);
    }
}
