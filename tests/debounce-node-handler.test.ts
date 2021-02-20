import {AStream} from '../src';
import {setupMockClock} from './util/clock-mock';
import * as chai from 'chai';
import * as sinon from 'sinon';

const {expect} = chai;

describe('DebounceNode', () => {
    let tick = setupMockClock();

    describe('.debounce()', () => {
        it('Waits to send out single event', async () => {
            let input = 'data';
            let output = undefined;

            const debouncedStream = new AStream(x => x)
                .debounce(1000);
            debouncedStream(input).then(x => output = x);

            await tick(900);

            expect(output).to.equal(undefined);

            await tick(200);

            expect(output).to.equal(input);
        });

        it('Ignores skipped events', async () => {
            const debouncedStream = new AStream(x => x)
                .debounce(1000);

            const callback1 = sinon.spy();
            debouncedStream('event').then(callback1);
            await tick(900);

            const callback2 = sinon.spy();
            debouncedStream('event').then(callback2);
            await tick(1100);

            const callback3 = sinon.spy();
            debouncedStream('event').then(callback3);
            await tick(100);

            const callback4 = sinon.spy();
            debouncedStream('event').then(callback4);
            await tick(200);

            const callback5 = sinon.spy();
            debouncedStream('event').then(callback5);
            await tick(2000);

            expect(callback1.called).to.be.false;
            expect(callback2.called).to.be.true;
            expect(callback3.called).to.be.false;
            expect(callback4.called).to.be.false;
            expect(callback5.called).to.be.true;
        });
    });

});
