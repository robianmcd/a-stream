import {setupMockClock} from './util/clock-mock';
import * as chai from 'chai';
import * as sinon from 'sinon';
import {CanceledAStreamEvent} from '../src/errors/canceled-a-stream-event';
import {streamUtil} from './util/stream-util';

const {expect} = chai;

describe('LatestNode', () => {
    let tick = setupMockClock();

    describe('.latest()', () => {
        it('does not effect ordered events', async () => {
            const nextStreamExecutor = sinon.spy();
            const catchStreamExecutor = sinon.spy();
            const stream = streamUtil.getDelayableStream()
                .latest()
                .next(nextStreamExecutor)
                .errorHandler(catchStreamExecutor);

            stream({timeout: 1000});
            stream({timeout: 2000, reject: true});
            stream({timeout: 3000});

            await tick(1000);

            expect(nextStreamExecutor.calledWith(1000)).to.be.true;

            await tick(1000);

            expect(catchStreamExecutor.calledWith(2000)).to.be.true;

            await tick(1000);

            expect(nextStreamExecutor.calledWith(3000)).to.be.true;
        });

        it('creates AStream errors for obsolete events', async () => {
            const nextStreamExecutor = sinon.spy();
            const catchExecutor = sinon.spy();
            const catchAStreamErrorExecutor = sinon.spy();

            const stream = streamUtil.getDelayableStream()
                .latest()
                .next(nextStreamExecutor)
                .errorHandler(catchExecutor)
                .canceledEventHandler(catchAStreamErrorExecutor);

            stream({timeout: 2000, reject: true}); // obsolete error
            stream({timeout: 1000});
            stream({timeout: 4000}); // obsolete success
            stream({timeout: 3000});

            await tick(1000);

            expect(nextStreamExecutor.calledWith(1000)).to.be.true;
            expect(catchExecutor.callCount).to.equal(0);
            expect(catchAStreamErrorExecutor.calledWith(sinon.match.instanceOf(CanceledAStreamEvent))).to.be.true;

            await tick(2000);

            expect(nextStreamExecutor.calledWith(3000)).to.be.true;

            expect(catchExecutor.callCount).to.equal(0);
            expect(catchAStreamErrorExecutor.callCount).to.equal(2);
            expect(catchAStreamErrorExecutor.lastCall.calledWith(sinon.match.instanceOf(CanceledAStreamEvent))).to.be.true;
        });

    });

});
