import {ReadableStateStream} from './readable-state-stream.interface';
import {BaseEventHandler} from '../event-handlers/base-event-handler';
import {CustomEventHandler, Executor} from '../event-handlers/custom-event-handler';
import {ErrorEventHandler, RejectedExecutor} from '../event-handlers/error-event-handler';
import {DebounceEventHandler} from '../event-handlers/debounce-event-handler';
import {AddAdapterNodeOptions, AddChildNodeOptions, AddChildOptions, BaseEventNode, NodeOptions} from '../nodes/base-event-node';
import {SourceNode} from '../nodes/source-node';
import {RunOptions} from './run-options';
import {
    CanceledEventExecutor,
    CanceledEventHandler
} from '../event-handlers/canceled-event-handler';
import {PendingChangesEventHandler} from '../event-handlers/pending-changes-event-handler';
import {FilterEventHandler, PredicateFunction} from '../event-handlers/filter-event-handler';
import {ParentInputConnectionMgr} from '../nodes/parent-input-connection-mgr';
import {BaseAdapterEventHandler} from '../event-handlers/base-adapter-event-handler';
import {CombineEventHandler} from '../event-handlers/combine-event-handler';
import {ReadableAStream} from './readable-a-stream.interface';
import {InputConnectionMgr} from '../nodes/input-connection-mgr.interface';
import {AStreamOptions} from './state-stream';

export abstract class BaseAStreamNode<T, TResult, SourceParams extends any[]> extends Function implements ReadableAStream<TResult> {
    get acceptingEvents(): Promise<any> { return this._node.acceptingEvents; }
    get pending(): boolean { return this._node.pending; }
    get connected(): boolean { return this._node.connected; }

    //Can be overridden by Proxy in call to .asReadonly()
    get readonly() { return false };

    _node: BaseEventNode<T, TResult>;
    protected _sourceNode: SourceNode<SourceParams, any>;

    private _self: BaseAStreamNode<T, TResult, SourceParams>;
    constructor(
        node: BaseEventNode<T, TResult>,
        sourceNode: SourceNode<SourceParams, any>
    ) {
        //Nothing to see here. Move along
        //Based on https://stackoverflow.com/a/40878674/373655
        super('...args', 'return this._self.run(...args)');

        //In the constructor we need to use this._self instead of this to get this callable class magic to work
        this._self = this.bind(this);

        this._self._node = node;
        this._self._sourceNode = sourceNode;

        return this._self;
    }

    run(...args: SourceParams | [...SourceParams, RunOptions]): Promise<TResult> {
        let runOptions: RunOptions;
        if (args.length && args[args.length - 1] instanceof RunOptions) {
            runOptions = args.pop();
        } else {
            runOptions = new RunOptions();
        }
        if (this.connected === false) {
            return this.acceptingEvents;
        } else {
            return this._sourceNode.runSource(<SourceParams>args, this._node, runOptions);
        }
    }

    endStream(): Promise<void> {
        return this._sourceNode.disconnect();
    }

    async disconnect(): Promise<void> {
        return this._node.disconnect();
    }

    disconnectDownstream(locatorStreamNode: ReadableStateStream<any, any>): Promise<void> {
        return this._node.disconnectDownstream(locatorStreamNode['_node']);
    }

    addChild<TEventInput = TResult, TChildResult = unknown>(
        childEventHandler: BaseEventHandler<TEventInput, TChildResult, any>,
        nodeOptions: AddChildNodeOptions<TChildResult>,
        additionalParents: BaseAStreamNode<any, TEventInput, any>[] = []
    ): BaseAStreamNode<TEventInput, TChildResult, SourceParams> {
        let additionalParentNodes = additionalParents.map(streamNode => streamNode._node);
        let allParentNodes = [this._node, ...additionalParentNodes];
        let inputConnectionMgr = new ParentInputConnectionMgr(allParentNodes);
        let defaultedNodeOptions: NodeOptions<TChildResult> & Required<AddChildOptions> = Object.assign({}, {ignoreInitialParentState: false}, nodeOptions);
        let streamNode;
        let childNode = this._createChildEventNode(childEventHandler, inputConnectionMgr, () => streamNode, defaultedNodeOptions, this._node.streamOptions);
        inputConnectionMgr.init(childNode);

        streamNode = this._createChildStreamNode(childNode);
        allParentNodes.forEach(node => node.connectChild(childNode, defaultedNodeOptions));

        return streamNode;
    }

    addAdapter<TChildResult>(
        adapterEventHandler: BaseAdapterEventHandler<TResult, TChildResult, any>,
        nodeOptions: AddChildNodeOptions<TChildResult>
    ): ReadableStateStream<TResult, TChildResult> {
        let inputConnectionMgr = new ParentInputConnectionMgr([this._node]);
        let defaultedNodeOptions = Object.assign({}, {
            terminateInputEvents: true,
            ignoreInitialParentState: false
        }, nodeOptions);
        let streamNode;
        let adapterNode = new SourceNode(adapterEventHandler, inputConnectionMgr, () => streamNode, defaultedNodeOptions, this._node.streamOptions);
        inputConnectionMgr.init(adapterNode);
        adapterEventHandler.init(adapterNode);

        streamNode = this._createChildStreamNode(adapterNode).asReadonly();

        this._node.connectChild(adapterNode, defaultedNodeOptions);

        return streamNode;
    }

    asReadonly(): ReadableStateStream<T, TResult> {
        const restrictedMethods = ['run', 'endStream', 'disconnect'];
        const readonlyProxy = new Proxy(this, {
            get(self, prop) {
                if (restrictedMethods.includes(<string>prop)) {
                    return undefined;
                } else if (prop === 'readonly') {
                    return true;
                } else if (prop === '_createChildStreamNode') {
                    return <TChildResult>(...args) => {
                        return self._createChildStreamNode.call(readonlyProxy, ...args).asReadonly();
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

    next<TChildResult>(
        fulfilledEventHandler: Executor<TResult, TChildResult, BaseAStreamNode<TResult, TChildResult, SourceParams>>,
        nodeOptions: AddChildNodeOptions<TChildResult> = {}
    ): BaseAStreamNode<TResult, TChildResult, SourceParams> {
        const customEventHandler = new CustomEventHandler(fulfilledEventHandler);
        return this.addChild(customEventHandler, nodeOptions);
    };

    errorHandler(
        rejectedEventHandler: RejectedExecutor<TResult, BaseAStreamNode<TResult, TResult, SourceParams>>,
        nodeOptions: AddChildNodeOptions<TResult> = {}
    ): BaseAStreamNode<TResult, TResult, SourceParams> {
        const catchEventHandler = new ErrorEventHandler(rejectedEventHandler);
        return this.addChild(catchEventHandler, nodeOptions);
    };

    canceledEventHandler(
        aStreamErrorHandler: CanceledEventExecutor<TResult, BaseAStreamNode<TResult, TResult, SourceParams>>,
        nodeOptions: AddChildNodeOptions<TResult> = {}
    ): BaseAStreamNode<TResult, TResult, SourceParams> {
        const catchAStreamErrorEventHandler = new CanceledEventHandler(aStreamErrorHandler);
        return this.addChild(catchAStreamErrorEventHandler, nodeOptions);
    };

    filter(
        predicate: PredicateFunction<TResult, BaseAStreamNode<TResult, TResult, SourceParams>>,
        nodeOptions: AddChildNodeOptions<TResult> = {}
    ): BaseAStreamNode<TResult, TResult, SourceParams> {
        const catchEventHandler = new FilterEventHandler(predicate);
        return this.addChild(catchEventHandler, nodeOptions);
    };

    debounce(durationMs: number = 200, nodeOptions: AddChildNodeOptions<TResult> = {}): BaseAStreamNode<TResult, TResult, SourceParams> {
        const debounceEventHandler = new DebounceEventHandler<TResult, BaseAStreamNode<TResult, TResult, SourceParams>>(durationMs);
        return this.addChild(debounceEventHandler, nodeOptions);
    };

    pendingChangesStream(nodeOptions: AddAdapterNodeOptions<boolean> = {}): ReadableStateStream<TResult, boolean> {
        let pendingChangesEventHandler = new PendingChangesEventHandler<TResult, ReadableStateStream<TResult, boolean>>();
        return this.addAdapter(pendingChangesEventHandler, nodeOptions);
    }

    //TODO: see if it is possible to dynamically define combine using this technique https://stackoverflow.com/a/51977360/373655
    combine<TInput2>(
        streamNodes: [BaseAStreamNode<any, TInput2, any>],
        fulfilledEventHandler?: Executor<[TResult, TInput2], TResult, BaseAStreamNode<[TResult, TInput2], TResult, SourceParams>>,
        nodeOptions?: NodeOptions<[TResult, TInput2]>
    ): BaseAStreamNode<TResult | TInput2, [TResult, TInput2], SourceParams>;

    combine<TInput2, TInput3>(
        streamNodes: [BaseAStreamNode<any, TInput2, any>, BaseAStreamNode<any, TInput3, any>],
        fulfilledEventHandler?: Executor<[TResult, TInput2, TInput3], TResult, BaseAStreamNode<[TResult, TInput2, TInput3], TResult, SourceParams>>,
        nodeOptions?: NodeOptions<[TResult, TInput2, TInput3]>
    ): BaseAStreamNode<TResult | TInput2 | TInput3, [TResult, TInput2, TInput3], SourceParams>;

    combine<TInput2, TInput3, TInput4>(
        streamNodes: [BaseAStreamNode<any, TInput2, any>, BaseAStreamNode<any, TInput3, any>, BaseAStreamNode<any, TInput4, any>],
        fulfilledEventHandler?: Executor<[TResult, TInput2, TInput3, TInput4], TResult, BaseAStreamNode<[TResult, TInput2, TInput3, TInput4], TResult, SourceParams>>,
        nodeOptions?: NodeOptions<[TResult, TInput2, TInput3, TInput4]>
    ): BaseAStreamNode<TResult | TInput2 | TInput3 | TInput4, [TResult, TInput2, TInput3, TInput4], SourceParams>;

    combine<TInputs extends any[], TChildResult>(
        streamNodes: BaseAStreamNode<any, any, any>[],
        fulfilledEventHandler: Executor<TInputs, TChildResult, BaseAStreamNode<TInputs[keyof TInputs], TChildResult, SourceParams>> = ((x: TInputs) => <TChildResult><any>x),
        nodeOptions: NodeOptions<TChildResult> = {}
    ): BaseAStreamNode<TInputs[keyof TInputs], TChildResult, SourceParams> {
        let allParentStreamNodes = [this, ...streamNodes];
        let combineEventHandler = new CombineEventHandler<TInputs, TChildResult, BaseAStreamNode<TInputs[keyof TInputs], TChildResult, SourceParams>>(allParentStreamNodes, fulfilledEventHandler);
        return this.addChild<TInputs[keyof TInputs], TChildResult>(combineEventHandler, nodeOptions, streamNodes);
    }

    protected abstract _createChildEventNode<TChildResult>(
        eventHandler: BaseEventHandler<any, TChildResult, any>,
        inputConnectionMgr: InputConnectionMgr,
        getStreamNode: () => any,
        nodeOptions: NodeOptions<TChildResult>,
        streamOptions: AStreamOptions
    ): BaseEventNode<TResult, TChildResult, SourceParams>;

    protected abstract _createChildStreamNode(childNode): BaseAStreamNode<any, any, SourceParams>;
}

export interface BaseNode<T, TResult, SourceParams extends any[]> {
    (...args: SourceParams): Promise<TResult>;
}
