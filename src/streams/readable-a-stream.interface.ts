import {Executor} from '../event-handlers/custom-event-handler';
import {RejectedExecutor} from '../event-handlers/catch-event-handler';
import {Node, NodeOptions} from '../nodes/node';
import {AStreamErrorExecutor} from '../event-handlers/a-stream-error-event-handler';

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

    next<TChildResult>(fulfilledEventHandler: Executor<TResult, TChildResult>, nodeOptions?: NodeOptions<TChildResult>): ReadableAStream<TResult, TChildResult>;
    catch(rejectedEventHandler: RejectedExecutor<TResult>, nodeOptions?: NodeOptions<TResult>): ReadableAStream<TResult, TResult>;
    debounce(durationMs: number, nodeOptions?: NodeOptions<TResult>): ReadableAStream<TResult, TResult>;
    latest(nodeOptions?: NodeOptions<TResult>): ReadableAStream<TResult, TResult>;
    catchAStreamError(aStreamErrorEventHandler: AStreamErrorExecutor<TResult>, nodeOptions?: NodeOptions<TResult>): ReadableAStream<TResult, TResult>;
}
