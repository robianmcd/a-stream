export interface ReadableAStream<TResult> {
    readonly acceptingEvents: Promise<any>;
    readonly pending: boolean;
    readonly readonly: boolean;

    disconnectDownstream(node: ReadableAStream<any>): void;
}
