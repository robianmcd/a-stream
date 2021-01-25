export class AStreamError extends Error {
    private __proto__;

    constructor(message: string) {
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
