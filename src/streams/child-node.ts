import {AStream} from './a-stream';
import {BaseNode} from './base-node';
import {CanceledAStreamError} from '../errors/canceled-a-stream-error';

export interface ChildNodeOptions<T, SourceParams extends any[]> {
    parentStream: BaseNode<any, T, SourceParams>;
}

export class ChildNode<T, TResult = T, SourceParams extends any[] = [T]> extends BaseNode<T, TResult, SourceParams> {
    _parentStream: BaseNode<any, T, SourceParams>;

    get _sourceStream(): AStream<SourceParams, unknown> {
        return this._parentStream._sourceStream;
    }

    constructor(
        options: ChildNodeOptions<T, SourceParams>,
    ) {
        super();

        this._parentStream = options.parentStream;
    }

    async remove(): Promise<void> {
        //TODO: implement in parent and pass in `this`
        let streamIndex = this._parentStream._nextStreams.findIndex(s => s === this);
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
}
