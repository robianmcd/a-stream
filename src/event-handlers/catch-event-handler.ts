import {BaseNode} from '../streams/base-node';
import {BaseEventHandler} from './base-event-handler';

export interface RejectedExecutor<TResult> {
    (reason: any): Promise<TResult> | TResult
}

declare module '../streams/base-node' {
    export interface BaseNode<T, TResult, SourceParams extends any[]> {
        catch(
            rejectedEventHandler: RejectedExecutor<TResult>
        ): BaseNode<TResult, TResult, SourceParams>;
    }
}

BaseNode.prototype.catch = function <T, TResult, SourceParams extends any[]>(
    this: BaseNode<T, TResult, SourceParams>,
    rejectedEventHandler: RejectedExecutor<TResult>
): BaseNode<TResult, TResult, SourceParams> {
    const catchEventHandler = new CatchEventHandler<TResult>(rejectedEventHandler);
    return this.addChild(catchEventHandler);
};

export class CatchEventHandler<T> extends BaseEventHandler<T, T> {
    protected _rejectedEventHandler: (value: any) => Promise<T> | T;

    constructor(
        rejectedEventHandler: RejectedExecutor<T>,
    ) {
        super();

        this._rejectedEventHandler = rejectedEventHandler;
    }

    async handleRejectedEvent(reason, sequenceId: number): Promise<T> {
        return await this._rejectedEventHandler(reason);
    }
}
