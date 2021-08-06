import {ReadableStateStream} from './readable-state-stream.interface';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {Executor} from '../event-handlers/custom-event-handler';
import {RejectedExecutor} from '../event-handlers/error-event-handler';
import {AddAdapterNodeOptions, AddChildNodeOptions, NodeOptions} from '../nodes/base-event-node';
import {SourceNode} from '../nodes/source-node';
import {
    CanceledEventExecutor
} from '../event-handlers/canceled-event-handler';
import {PredicateFunction} from '../event-handlers/filter-event-handler';

import {BaseAStreamNode} from './base-a-stream-node';
import {InputConnectionMgr} from '../nodes/input-connection-mgr.interface';
import {AStreamOptions} from './state-stream';
import {StateEventNode} from '../nodes/state-event-node';

export class StateStreamNode<T, TResult, SourceParams extends any[]> extends BaseAStreamNode<T, TResult, SourceParams> implements ReadableStateStream<T, TResult> {
    _node: StateEventNode<T, TResult>;

    get status(): 'success' | 'error' | 'uninitialized' { return this._node.status; }
    get value(): TResult { return this._node.value; }
    get error(): any { return this._node.error; }
    get initializing(): Promise<void> {return this._node.initializing; }

    //TODO: redefine as SourceStateNode
    // protected _sourceNode: SourceNode<SourceParams, any>;

    constructor(
        node: StateEventNode<T, TResult>,
        sourceNode: SourceNode<SourceParams, any>
    ) {
        super(node, sourceNode);
    }

    hasValue(): boolean { return this.status === 'success' }
    hasError(): boolean { return this.status === 'error' }
    isInitialized(): boolean { return this.status !== 'uninitialized' }

    protected _createChildEventNode<TChildResult>(
        eventHandler: BaseEventHandler<any, TChildResult, any>,
        inputConnectionMgr: InputConnectionMgr,
        getStreamNode: () => any,
        nodeOptions: NodeOptions<TChildResult>,
        streamOptions: AStreamOptions
    ): StateEventNode<TResult, TChildResult, SourceParams> {
        return new StateEventNode(eventHandler, inputConnectionMgr, getStreamNode, nodeOptions, streamOptions);
    }

    protected _createChildStreamNode(childNode) {
        return new StateStreamNode<any, any, SourceParams>(
            childNode,
            this._sourceNode
        );
    }

    next: <TChildResult>(
        fulfilledEventHandler: Executor<TResult, TChildResult, StateStreamNode<TResult, TChildResult, SourceParams>>,
        nodeOptions?: AddChildNodeOptions<TChildResult>
    ) => StateStreamNode<TResult, TChildResult, SourceParams> = <any>super.next;

    errorHandler: (
        rejectedEventHandler: RejectedExecutor<TResult, StateStreamNode<TResult, TResult, SourceParams>>,
        nodeOptions?: NodeOptions<TResult>
    ) => StateStreamNode<TResult, TResult, SourceParams> = <any>super.errorHandler;

    canceledEventHandler: (
        aStreamErrorEventHandler: CanceledEventExecutor<TResult, StateStreamNode<TResult, TResult, SourceParams>>,
        nodeOptions?: NodeOptions<TResult>
    ) => StateStreamNode<TResult, TResult, SourceParams> = <any>super.canceledEventHandler;

    filter: (
        predicate: PredicateFunction<TResult, StateStreamNode<TResult, TResult, SourceParams>>,
        nodeOptions?: AddChildNodeOptions<TResult>
    ) => StateStreamNode<TResult, TResult, SourceParams> = <any>super.filter;

    debounce: (durationMs: number, nodeOptions?: NodeOptions<TResult>) => StateStreamNode<TResult, TResult, SourceParams> = <any>super.debounce;

    pendingChangesStream: (nodeOptions?: AddAdapterNodeOptions<boolean>) => StateStreamNode<TResult, boolean, SourceParams> = <any>super.pendingChangesStream;
}
