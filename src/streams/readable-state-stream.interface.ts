import {Executor} from '../event-handlers/custom-event-handler';
import {RejectedExecutor} from '../event-handlers/error-event-handler';
import {AddAdapterNodeOptions, AddChildNodeOptions, NodeOptions} from '../nodes/base-event-node';
import {CanceledEventExecutor} from '../event-handlers/canceled-event-handler';
import {PredicateFunction} from '../event-handlers/filter-event-handler';
import {ReadableAStream} from './readable-a-stream.interface';

export interface ReadableStateStream<T, TResult> extends ReadableAStream<TResult> {
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

    disconnectDownstream(node: ReadableStateStream<any, any>): void;

    next<TChildResult>(
        fulfilledEventHandler: Executor<TResult, TChildResult, ReadableStateStream<TResult, TChildResult>>,
        nodeOptions?: NodeOptions<TChildResult>
    ): ReadableStateStream<TResult, TChildResult>;

    errorHandler(
        rejectedEventHandler: RejectedExecutor<TResult, ReadableStateStream<TResult, TResult>>,
        nodeOptions?: NodeOptions<TResult>
    ): ReadableStateStream<TResult, TResult>;

    canceledEventHandler(
        aStreamErrorEventHandler: CanceledEventExecutor<TResult, ReadableStateStream<TResult, TResult>>,
        nodeOptions?: NodeOptions<TResult>
    ): ReadableStateStream<TResult, TResult>;

    filter(
        predicate: PredicateFunction<TResult, ReadableStateStream<TResult, TResult>>,
        nodeOptions: AddChildNodeOptions<TResult>
    ): ReadableStateStream<TResult, TResult>;

    debounce(durationMs: number, nodeOptions?: NodeOptions<TResult>): ReadableStateStream<TResult, TResult>;

    pendingChangesStream(nodeOptions: AddAdapterNodeOptions<boolean>): ReadableStateStream<TResult, boolean>;
}
