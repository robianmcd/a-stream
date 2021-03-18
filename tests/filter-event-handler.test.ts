import {AStream} from '../src';
import * as chai from 'chai';
import * as sinon from 'sinon';
import {setupMockClock} from './util/clock-mock';
import {SkippedAStreamError} from '../src/errors/skipped-a-stream-error';

const {expect} = chai;


describe('FilterEventHandler', () => {
    let tick = setupMockClock();

    it('can filter out events', async () => {
        const nextExecutor = sinon.spy(x => x);

        const stream = new AStream(x => x)
            .filter(x => x > 0)
            .catch(x => x)
            .next(nextExecutor);

        let result = await stream(1);
        expect(result).to.equal(1);
        expect(nextExecutor.calledWith(1)).to.be.true;

        stream(-1);
        stream(-2);
        await tick(0);

        expect(nextExecutor.callCount).to.equal(1);
    });

    it('Throws AStream errors for filtered events', async () => {
        const catchExecutor = sinon.spy(x => x);
        const catchAStreamExecutor = sinon.spy(x => x);

        const stream = new AStream(x => x)
            .filter(x => false)
            .catch(catchExecutor)
            .catchAStreamError(catchAStreamExecutor);

        stream(1);
        await tick(0);

        expect(catchExecutor.callCount).to.equal(0);
        expect(catchAStreamExecutor.calledWith(sinon.match.instanceOf(SkippedAStreamError))).to.be.true;
    });

});
