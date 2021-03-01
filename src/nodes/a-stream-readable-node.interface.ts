import {Executor} from '../event-handlers/custom-event-handler';
import {RejectedExecutor} from '../event-handlers/catch-event-handler';
import {NodeInternals} from './node-internals';

export interface AStreamReadableNode<T, TResult> {
    acceptingEvents: Promise<any>;
    readonly pending: boolean;
    readonly readonly: boolean;

    status: 'success' | 'error' | 'uninitialized';
    value: TResult;
    error: any;

    hasValue(): boolean;
    hasError(): boolean;
    isInitialized(): boolean;

    disconnectDownstream(node: AStreamReadableNode<any, any>): void;
    _disconnectFromParent(parentNodeInternals: NodeInternals<any, T>);

    next<TChildResult>(fulfilledEventHandler: Executor<TResult, TChildResult>): AStreamReadableNode<TResult, TChildResult>;
    catch(rejectedEventHandler: RejectedExecutor<TResult>): AStreamReadableNode<TResult, TResult>;
    debounce(durationMs: number): AStreamReadableNode<TResult, TResult>;
    latest(): AStreamReadableNode<TResult, TResult>;
}
