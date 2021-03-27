export enum CanceledAStreamEventReason {
    StreamEnded = "STREAM_ENDED",
    Obsolete = "OBSOLETE",
    Skipped = "SKIPPED",
    Terminated = "TERMINATED"
}

export class CanceledAStreamEvent extends Error {
    private __proto__;

    constructor(reason: CanceledAStreamEventReason, message: string) {
        super(message);

        // Fixes issue with extending Error
        // https://stackoverflow.com/a/48342359/373655
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            this.__proto__ = actualProto;
        }

    }
}
