import {AStream} from './a-stream';
import {BaseNode} from './base-node';

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

    async disconnectNode(): Promise<void> {
        //TODO: implement in parent and pass in `this`
        let streamIndex = this._parentStream._nextStreams.findIndex(s => s === this);
        if (streamIndex !== -1) {
            this._parentStream._nextStreams.splice(streamIndex, 1);
        } else {
            throw new Error("Stream doesn't exist in parent");
        }

        return super.disconnectNode();
    }
}
