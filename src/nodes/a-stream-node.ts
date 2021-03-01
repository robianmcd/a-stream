import {AStreamReadableNode} from './a-stream-readable-node.interface';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {CustomEventHandler, Executor} from '../event-handlers/custom-event-handler';
import {CatchEventHandler, RejectedExecutor} from '../event-handlers/catch-event-handler';
import {DebounceEventHandler} from '../event-handlers/debounce-event-handler';
import {LatestEventHandler} from '../event-handlers/latest-event-handler';
import {NodeInternals} from './node-internals';
import {SourceNodeInternals} from './source-node-internals';

export interface AStreamNodeOptions<T, TResult, SourceParams extends any[]> {
    sourceNodeInternals: SourceNodeInternals<SourceParams, any>;
    nodeInternals: NodeInternals<T, TResult>;
}

export class AStreamNode<T, TResult, SourceParams extends any[]> extends Function implements AStreamReadableNode<T, TResult> {
    get acceptingEvents(): Promise<any> { return this._nodeInternals.acceptingEvents; }
    get pending(): boolean { return this._nodeInternals.pending; }
    get connected(): boolean { return this._nodeInternals.connected; }
    get status(): 'success' | 'error' | 'uninitialized' { return this._nodeInternals.status; }
    get value(): TResult { return this._nodeInternals.value; }
    get error(): any { return this._nodeInternals.error; }

    //Can be overridden by Proxy in call to .asReadonly()
    get readonly() { return false };

    protected _nodeInternals: NodeInternals<T, TResult>;
    protected _sourceNodeInternals: SourceNodeInternals<SourceParams, any>;

    private _self: AStreamNode<T, TResult, SourceParams>;
    constructor(
        options: AStreamNodeOptions<T, TResult, SourceParams>,
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self = this.bind(this);

        this._self._nodeInternals = options.nodeInternals;
        this._self._sourceNodeInternals = options.sourceNodeInternals;

        return this._self;
    }

    hasValue(): boolean { return this.status === 'success' }
    hasError(): boolean { return this.status === 'error' }
    isInitialized(): boolean { return this.status !== 'uninitialized' }

    run(...args: SourceParams): Promise<TResult> {
        if (this.connected === false) {
            return this.acceptingEvents;
        } else {
            return this._sourceNodeInternals.runSource(args, this._nodeInternals);
        }
    }

    endStream(): Promise<void> {
        return this._sourceNodeInternals.disconnect();
    }

    async disconnect(): Promise<void> {
        return this._nodeInternals.disconnect();
    }

    disconnectDownstream(locatorNode: AStreamReadableNode<any, any>): void {
        return locatorNode._disconnectFromParent(this._nodeInternals);
    }

    _disconnectFromParent(parentNodeInternals: NodeInternals<any, T>) {
        parentNodeInternals.disconnectDownstream(this._nodeInternals);
    }

    addChild<TChildResult>(
        childEventHandler: BaseEventHandler<TResult, TChildResult>
    ): AStreamNode<TResult, TChildResult, SourceParams> {
        const childNodeInternals = this._nodeInternals.addChild(childEventHandler);
        return new AStreamNode({
            sourceNodeInternals: this._sourceNodeInternals,
            nodeInternals: childNodeInternals
        });
    }

    asReadonly(): AStreamReadableNode<T, TResult> {
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

    next<TChildResult>(fulfilledEventHandler: Executor<TResult, TChildResult>): AStreamNode<TResult, TChildResult, SourceParams> {
        const customEventHandler = new CustomEventHandler<TResult, TChildResult>(fulfilledEventHandler);
        return this.addChild(customEventHandler);
    };

    catch(rejectedEventHandler: RejectedExecutor<TResult>): AStreamNode<TResult, TResult, SourceParams> {
        const catchEventHandler = new CatchEventHandler<TResult>(rejectedEventHandler);
        return this.addChild(catchEventHandler);
    };

    debounce(durationMs: number = 200): AStreamNode<TResult, TResult, SourceParams> {
        const debounceEventHandler = new DebounceEventHandler<TResult>(durationMs);
        return this.addChild(debounceEventHandler);
    };

    latest<TChildResult>(): AStreamNode<TResult, TResult, SourceParams> {
        const latestNode = new LatestEventHandler<TResult, SourceParams>();
        return this.addChild(latestNode);
    };
}

export interface BaseNode<T, TResult, SourceParams extends any[]> {
    (...args: SourceParams): Promise<TResult>;
}
