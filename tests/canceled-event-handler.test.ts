import {AStream} from '../src';
import * as chai from 'chai';
import {CanceledAStreamEvent, CanceledAStreamEventReason} from '../src/errors/canceled-a-stream-event';
import * as sinon from 'sinon';

const {expect} = chai;

describe('CatchAStreamErrorEventHandler', () => {

    describe('.canceledEventHandler()', () => {
        it('can errorHandler and recover from AStreamErrors', async () => {
            const catchStreamExecutor = sinon.spy(() => 'recovered');
            const nextStreamExecutor = sinon.spy(msg => msg);

            const stream1 = new AStream(() => {
                throw new CanceledAStreamEvent(CanceledAStreamEventReason.Skipped, 'message');
            });
            const stream2 = stream1.canceledEventHandler(catchStreamExecutor);
            const stream3 = stream2.next(nextStreamExecutor);

            let result = await stream3(1);
            expect(result).to.equal('recovered');
            expect(catchStreamExecutor.calledWith(sinon.match.instanceOf(CanceledAStreamEvent))).to.be.true;
            expect(nextStreamExecutor.calledWith('recovered')).to.be.true;
        });
    });

});
