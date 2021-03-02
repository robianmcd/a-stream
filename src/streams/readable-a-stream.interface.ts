import {Executor} from '../event-handlers/custom-event-handler';
import {RejectedExecutor} from '../event-handlers/catch-event-handler';
import {Node} from '../nodes/node';

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

    next<TChildResult>(fulfilledEventHandler: Executor<TResult, TChildResult>): ReadableAStream<TResult, TChildResult>;
    catch(rejectedEventHandler: RejectedExecutor<TResult>): ReadableAStream<TResult, TResult>;
    debounce(durationMs: number): ReadableAStream<TResult, TResult>;
    latest(): ReadableAStream<TResult, TResult>;
}
