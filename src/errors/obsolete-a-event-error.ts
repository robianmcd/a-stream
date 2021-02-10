import {AStreamError} from './a-stream-error';

export class ObsoleteAStreamError extends AStreamError {
    constructor(message) {
        super(message);
    }
}
