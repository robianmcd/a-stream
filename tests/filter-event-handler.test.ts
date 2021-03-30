import {AStream} from '../src';
import * as chai from 'chai';
import * as sinon from 'sinon';
import {setupMockClock} from './util/clock-mock';
import {CanceledAStreamEvent} from '../src/errors/canceled-a-stream-event';

const {expect} = chai;


describe('FilterEventHandler', () => {
    let tick = setupMockClock();

    it('can filter out events', async () => {
        const nextExecutor = sinon.spy(x => x);

        const stream = new AStream(x => x)
            .filter(x => x > 0)
            .errorHandler(x => x)
            .next(nextExecutor);

        let result = await stream(1);
        expect(result).to.equal(1);
        expect(nextExecutor.calledWith(1)).to.be.true;

        stream(-1);
        stream(-2);
        await tick(0);

        expect(nextExecutor.callCount).to.equal(1);
    });

    it('can access current state through context', async () => {
        const stream = new AStream((x: number) => x)
            .filter((x, context) => x !== context.streamNode.value)

        expect(await stream(1)).to.equal(1);
        expect(await stream(1).catch(() => 'error')).to.equal('error');
        expect(await stream(2)).to.equal(2);
        expect(await stream(2).catch(() => 'error')).to.equal('error');
        expect(await stream(1)).to.equal(1);
        expect(await stream(3)).to.equal(3);
        expect(await stream(3).catch(() => 'error')).to.equal('error');
    });

    it('Throws AStream errors for filtered events', async () => {
        const catchExecutor = sinon.spy(x => x);
        const catchAStreamExecutor = sinon.spy(x => x);

        const stream = new AStream(x => x)
            .filter(() => false)
            .errorHandler(catchExecutor)
            .canceledEventHandler(catchAStreamExecutor);

        stream(1);
        await tick(0);

        expect(catchExecutor.callCount).to.equal(0);
        expect(catchAStreamExecutor.calledWith(sinon.match.instanceOf(CanceledAStreamEvent))).to.be.true;
    });

});
