import {Node, NodeOptions} from './node';
import type {AStreamOptions} from '../streams/a-stream';
import {RunOptions} from '../streams/run-options';

export class SourceNode<T, TResult> extends Node<T, TResult> {
    private _nextSequenceId: number;

    constructor(
        nodeOptions: NodeOptions<T, TResult>,
        streamOptions: AStreamOptions
    ) {
        super(nodeOptions, streamOptions);

        this._nextSequenceId = 0;
    }

    async runSource<TInitiatorResult>(
        value: T, initiator: Node<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        return this.runNode(Promise.resolve(value), initiator, this._nextSequenceId++, runOptions);
    }

    async sendOutputEvent<TInitiatorResult>(
        result: TResult, initiator: Node<unknown, TInitiatorResult>, runOptions: RunOptions
    ): Promise<TInitiatorResult> {
        //TODO: do we need to race this against acceptingEvents Promise (here or in _setupOutputEvent)?
        const sequenceId = this._nextSequenceId++;
        this._onOutputEventStart(sequenceId);
        return this._setupOutputEvent(Promise.resolve(result), initiator, sequenceId, runOptions);
    }


}
