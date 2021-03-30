import {Executor} from '../event-handlers/custom-event-handler';
import {RejectedExecutor} from '../event-handlers/error-event-handler';
import {AddAdapterNodeOptions, AddChildNodeOptions, Node, NodeOptions} from '../nodes/node';
import {CanceledEventExecutor} from '../event-handlers/canceled-event-handler';
import {PredicateFunction} from '../event-handlers/filter-event-handler';

export interface ReadableAStream<T, TResult> {
    readonly acceptingEvents: Promise<any>;
    readonly pending: boolean;
    readonly readonly: boolean;

    readonly status: 'success' | 'error' | 'uninitialized';
    readonly value: TResult;
    readonly error: any;
    readonly initializing: Promise<void>;

    hasValue(): boolean;
    hasError(): boolean;
    isInitialized(): boolean;

    disconnectDownstream(node: ReadableAStream<any, any>): void;
    _disconnectFromParent(parentNode: Node<any, T>);

    next<TChildResult>(
        fulfilledEventHandler: Executor<TResult, TChildResult, ReadableAStream<TResult, TChildResult>>,
        nodeOptions?: NodeOptions<TChildResult>
    ): ReadableAStream<TResult, TChildResult>;

    errorHandler(
        rejectedEventHandler: RejectedExecutor<TResult, ReadableAStream<TResult, TResult>>,
        nodeOptions?: NodeOptions<TResult>
    ): ReadableAStream<TResult, TResult>;

    canceledEventHandler(
        aStreamErrorEventHandler: CanceledEventExecutor<TResult, ReadableAStream<TResult, TResult>>,
        nodeOptions?: NodeOptions<TResult>
    ): ReadableAStream<TResult, TResult>;

    filter(
        predicate: PredicateFunction<TResult, ReadableAStream<TResult, TResult>>,
        nodeOptions: AddChildNodeOptions<TResult>
    ): ReadableAStream<TResult, TResult>;

    debounce(durationMs: number, nodeOptions?: NodeOptions<TResult>): ReadableAStream<TResult, TResult>;

    latest(nodeOptions?: NodeOptions<TResult>): ReadableAStream<TResult, TResult>;

    pendingChangesStream(nodeOptions: AddAdapterNodeOptions<boolean>): ReadableAStream<TResult, boolean>;
}
