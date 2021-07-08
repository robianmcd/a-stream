import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {ReadableAStream} from '../streams/readable-a-stream.interface';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../errors/canceled-a-stream-event';
import {Executor} from './custom-event-handler';


//Combine TODO:
// Either:
//  - take array of parents
//  - Add parents to context
//  - get parents from context.streamNode. Maybe need to say TStreamNode extends ReadableStreamNode<...> or something like that
// Track state of each parent. Send output events
// How to handel errors? either need to pass status and value or ignore errors, or **reset parent state to uninitialized on error**
export class CombineEventHandler<TInputs extends any[], TResult, TStreamNode> extends BaseEventHandler<TInputs[keyof TInputs], TResult, TStreamNode> {
    protected lastValuesByStreamNode = new Map<ReadableAStream<any, TInputs[keyof TInputs]>, TInputs[keyof TInputs]>();

    constructor(
        protected _parentStreamNodes: ReadableAStream<any, TInputs[keyof TInputs]>[],
        protected _inputHandler: Executor<TInputs, TResult, TStreamNode>,
    ) {
        super();
    }

    async handleFulfilledEvent(value: TInputs[keyof TInputs], context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> {
        this.lastValuesByStreamNode.set(context.parentStreamNode, value);
        if(this._parentStreamNodes.every(parent => this.lastValuesByStreamNode.has(parent))) {
            const lastValues = this._parentStreamNodes.map(parent => this.lastValuesByStreamNode.get(parent));
            return await this._inputHandler(<any>lastValues, context);
        } else {
            return Promise.reject(new CanceledAStreamEvent(
                CanceledAStreamEventReason.Skipped,
                'Combine event handler has not received a value from all inputs yet.'
            ));
        }
    }

    handleRejectedEvent(reason, context: EventHandlerContext<TResult, TStreamNode>): Promise<TResult> {
        return Promise.reject(new CanceledAStreamEvent(
            CanceledAStreamEventReason.Skipped,
            'Combine event handler received rejected input event.'
        ));
    }
}
