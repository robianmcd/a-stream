import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {ReadableAStream} from '../streams/readable-a-stream.interface';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../errors/canceled-a-stream-event';


//Combine TODO:
// Either:
//  - take array of parents
//  - Add parents to context
//  - get parents from context.streamNode. Maybe need to say TStreamNode extends ReadableStreamNode<...> or something like that
// Track state of each parent. Send output events
// How to handel errors? either need to pass status and value or ignore errors, or **reset parent state to uninitialized on error**
export class CombineEventHandler<TResults extends any[], TStreamNode> extends BaseEventHandler<TResults[keyof TResults], TResults, TStreamNode> {
    protected lastValuesByStreamNode = new Map<ReadableAStream<any, TResults[keyof TResults]>, TResults[keyof TResults]>();

    constructor(
        protected parentStreamNodes: ReadableAStream<any, TResults[keyof TResults]>[],
    ) {
        super();
    }

    async handleFulfilledEvent(value: TResults[keyof TResults], context: EventHandlerContext<TResults, TStreamNode>): Promise<TResults> {
        this.lastValuesByStreamNode.set(context.parentStreamNode, value);
        if(this.parentStreamNodes.every(parent => this.lastValuesByStreamNode.has(parent))) {
            const lastValues = this.parentStreamNodes.map(parent => this.lastValuesByStreamNode.get(parent));
            return Promise.resolve(<TResults>lastValues);
        } else {
            return Promise.reject(new CanceledAStreamEvent(
                CanceledAStreamEventReason.Skipped,
                'Combine event handler has not received a value from all inputs yet.'
            ));
        }
    }

    handleRejectedEvent(reason, context: EventHandlerContext<TResults, TStreamNode>): Promise<TResults> {
        return Promise.reject(new CanceledAStreamEvent(
            CanceledAStreamEventReason.Skipped,
            'Combine event handler received rejected input event.'
        ));
    }
}
