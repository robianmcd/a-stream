import {BaseEventHandler, EventHandlerContext} from './base-event-handler';
import {ReadableAStream} from '../streams/readable-a-stream.interface';


//Combine TODO:
// Either:
//  - take array of parents
//  - Add parents to context
//  - get parents from context.streamNode. Maybe need to say TStreamNode extends ReadableStreamNode<...> or something like that
// Track state of each parent. Send output events
// How to handel errors? either need to pass status and value or ignore errors, or **reset parent state to uninitialized on error**
export class CombineEventHandler<TResults extends any[], TStreamNode> extends BaseEventHandler<TResults[keyof TResults], TResults, TStreamNode> {
    constructor(
        protected parentStreamNodes: ReadableAStream<any, TResults[keyof TResults]>[],
    ) {
        super();
    }

    async handleFulfilledEvent(value: TResults[keyof TResults], context: EventHandlerContext<TResults, TStreamNode>): Promise<TResults> {
        return Promise.resolve(<any>value);
    }

    handleRejectedEvent(reason, context: EventHandlerContext<TResults, TStreamNode>): Promise<TResults> {
        return Promise.reject(reason);
    }
}
