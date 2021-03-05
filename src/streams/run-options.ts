export class RunOptions {
    rejectAStreamErrors: boolean;
    constructor({rejectAStreamErrors = false} = {}) {
        this. rejectAStreamErrors = rejectAStreamErrors;
    }
}
