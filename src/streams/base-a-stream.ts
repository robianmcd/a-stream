import {ReadableAStream} from './readable-a-stream.interface';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {CustomEventHandler, Executor} from '../event-handlers/custom-event-handler';
import {CatchEventHandler, RejectedExecutor} from '../event-handlers/catch-event-handler';
import {DebounceEventHandler} from '../event-handlers/debounce-event-handler';
import {LatestEventHandler} from '../event-handlers/latest-event-handler';
import {Node} from '../nodes/node';
import {SourceNode} from '../nodes/source-node';

export interface AStreamNodeOptions<T, TResult, SourceParams extends any[]> {
    sourceNode: SourceNode<SourceParams, any>;
    node: Node<T, TResult>;
}

export class BaseAStream<T, TResult, SourceParams extends any[]> extends Function implements ReadableAStream<T, TResult> {
    get acceptingEvents(): Promise<any> { return this._node.acceptingEvents; }
    get pending(): boolean { return this._node.pending; }
    get connected(): boolean { return this._node.connected; }
    get status(): 'success' | 'error' | 'uninitialized' { return this._node.status; }
    get value(): TResult { return this._node.value; }
    get error(): any { return this._node.error; }
    get initializing(): Promise<void> {return this._node.initializing; }

    //Can be overridden by Proxy in call to .asReadonly()
    get readonly() { return false };

    protected _node: Node<T, TResult>;
    protected _sourceNode: SourceNode<SourceParams, any>;

    private _self: BaseAStream<T, TResult, SourceParams>;
    constructor(
        options: AStreamNodeOptions<T, TResult, SourceParams>,
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self = this.bind(this);

        this._self._node = options.node;
        this._self._sourceNode = options.sourceNode;

        return this._self;
    }

    hasValue(): boolean { return this.status === 'success' }
    hasError(): boolean { return this.status === 'error' }
    isInitialized(): boolean { return this.status !== 'uninitialized' }

    run(...args: SourceParams): Promise<TResult> {
        if (this.connected === false) {
            return this.acceptingEvents;
        } else {
            return this._sourceNode.runSource(args, this._node);
        }
    }

    endStream(): Promise<void> {
        return this._sourceNode.disconnect();
    }

    async disconnect(): Promise<void> {
        return this._node.disconnect();
    }

    disconnectDownstream(locatorNode: ReadableAStream<any, any>): Promise<void> {
        return locatorNode._disconnectFromParent(this._node);
    }

    _disconnectFromParent(parentNode: Node<any, T>): Promise<void> {
        return parentNode.disconnectDownstream(this._node);
    }

    addChild<TChildResult>(
        childEventHandler: BaseEventHandler<TResult, TChildResult>
    ): BaseAStream<TResult, TChildResult, SourceParams> {
        const childNode = this._node.addChild(childEventHandler);
        return new BaseAStream({
            sourceNode: this._sourceNode,
            node: childNode
        });
    }

    asReadonly(): ReadableAStream<T, TResult> {
        const restrictedMethods = ['run', 'endStream', 'disconnect'];
        const readonlyProxy = new Proxy(this, {
            get(self, prop) {
                if (restrictedMethods.includes(<string>prop)) {
                    return undefined;
                } else if (prop === 'readonly') {
                    return true;
                } else if (prop === 'addChild') {
                    return <TChildResult>(childEventHandler: BaseEventHandler<TResult, TChildResult>) => {
                        return self.addChild.call(readonlyProxy, childEventHandler).asReadonly();
                    };
                } else {
                    let value = self[prop];
                    return (typeof value === 'function') ? value.bind(readonlyProxy) : value;
                }
            },
            apply(): never {
                throw new TypeError(`readonly AStream node is not a function.`);
            }
        });
        return readonlyProxy;
    }

    next<TChildResult>(fulfilledEventHandler: Executor<TResult, TChildResult>): BaseAStream<TResult, TChildResult, SourceParams> {
        const customEventHandler = new CustomEventHandler<TResult, TChildResult>(fulfilledEventHandler);
        return this.addChild(customEventHandler);
    };

    catch(rejectedEventHandler: RejectedExecutor<TResult>): BaseAStream<TResult, TResult, SourceParams> {
        const catchEventHandler = new CatchEventHandler<TResult>(rejectedEventHandler);
        return this.addChild(catchEventHandler);
    };

    debounce(durationMs: number = 200): BaseAStream<TResult, TResult, SourceParams> {
        const debounceEventHandler = new DebounceEventHandler<TResult>(durationMs);
        return this.addChild(debounceEventHandler);
    };

    latest<TChildResult>(): BaseAStream<TResult, TResult, SourceParams> {
        const latestNode = new LatestEventHandler<TResult, SourceParams>();
        return this.addChild(latestNode);
    };
}

export interface BaseNode<T, TResult, SourceParams extends any[]> {
    (...args: SourceParams): Promise<TResult>;
}