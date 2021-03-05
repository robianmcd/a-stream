import {AStream} from '../src';
import * as chai from 'chai';
import {AStreamError} from '../src/errors/a-stream-error';
import * as sinon from 'sinon';

const {expect} = chai;

describe('CatchAStreamErrorEventHandler', () => {

    describe('.catchAStreamError()', () => {
        it('can catch and recover from AStreamErrors', async () => {
            const catchStreamExecutor = sinon.spy(() => 'recovered');
            const nextStreamExecutor = sinon.spy(msg => msg);

            const stream1 = new AStream(() => {
                throw new AStreamError('message');
            });
            const stream2 = stream1.catchAStreamError(catchStreamExecutor);
            const stream3 = stream2.next(nextStreamExecutor);

            let result = await stream3(1);
            expect(result).to.equal('recovered');
            expect(catchStreamExecutor.calledWith(sinon.match.instanceOf(AStreamError))).to.be.true;
            expect(nextStreamExecutor.calledWith('recovered')).to.be.true;
        });
    });

});
