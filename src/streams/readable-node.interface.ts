import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {Executor} from '../event-handlers/custom-event-handler';
import {RejectedExecutor} from '../event-handlers/catch-event-handler';

export interface ReadableNode<T, TResult> {
    acceptingEvents: Promise<any>;
    isDisconnected: boolean;
    readonly pending: boolean;
    readonly readonly: boolean;

    status: 'success' | 'error' | 'uninitialized';
    value: TResult;
    error: any;

    hasValue(): boolean;
    hasError(): boolean;
    isInitialized(): boolean;

    disconnectDownstream(node: ReadableNode<any, any>): void;
    addChild<TChildResult>(childEventHandler: BaseEventHandler<TResult, TChildResult>): ReadableNode<TResult, TChildResult>;

    next<TChildResult>(fulfilledEventHandler: Executor<TResult, TChildResult>): ReadableNode<TResult, TChildResult>;
    catch(rejectedEventHandler: RejectedExecutor<TResult>): ReadableNode<TResult, TResult>;
    debounce(durationMs: number): ReadableNode<TResult, TResult>;
    latest(): ReadableNode<TResult, TResult>;
}
