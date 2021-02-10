import {AStream} from '../src';
import {setupMockClock} from './util/clock-mock';
import * as chai from 'chai';
import * as sinon from 'sinon';
import {ObsoleteAStreamError} from '../src/errors/obsolete-a-event-error';
import {streamUtil} from './util/stream-util';

const {expect} = chai;

describe('LatestNode', () => {
    let tick = setupMockClock();

    describe('.latest()', () => {
        it('does not effect ordered events', async () => {
            const nextStreamExecutor = sinon.spy();
            const catchStreamExecutor = sinon.spy();
            const sourceHandler = (timeout: number) => {
                return new Promise<number>((resolve, reject) => {
                    setTimeout(() => {
                        if (timeout % 2 === 0) {
                            resolve(timeout);
                        } else {
                            reject(timeout);
                        }
                    }, timeout);
                });
            };

            const stream = new AStream<[number], number>(sourceHandler)
                .latest()
                .next(nextStreamExecutor)
                .catch(catchStreamExecutor);

            stream(1000);
            stream(2001);
            stream(3000);

            await tick(1000);

            expect(nextStreamExecutor.calledWith(1000)).to.be.true;

            await tick(1001);

            expect(catchStreamExecutor.calledWith(2001)).to.be.true;

            await tick(1000);

            expect(nextStreamExecutor.calledWith(3000)).to.be.true;
        });

    });

    describe('.latest()', () => {
        it('does not effect ordered events', async () => {
            const nextStreamExecutor = sinon.spy();
            const catchStreamExecutor = sinon.spy();
            const stream = streamUtil.getDelayableStream()
                .latest()
                .next(nextStreamExecutor)
                .catch(catchStreamExecutor);

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

        it('rejects obsolete events', async () => {
            const nextStreamExecutor = sinon.spy();
            const catchStreamExecutor = sinon.spy();
            const stream = streamUtil.getDelayableStream()
                .latest()
                .next(nextStreamExecutor)
                .catch(catchStreamExecutor);

            stream({timeout: 2000, reject: true}); // obsolete error
            stream({timeout: 1000});
            stream({timeout: 4000}); // obsolete success
            stream({timeout: 3000});

            await tick(1000);

            expect(nextStreamExecutor.calledWith(1000)).to.be.true;

            await tick(1000);

            expect(catchStreamExecutor.calledWith(sinon.match.instanceOf(ObsoleteAStreamError))).to.be.true;

            await tick(1000);

            expect(nextStreamExecutor.calledWith(3000)).to.be.true;

            await tick(1000);

            expect(catchStreamExecutor.callCount).to.equal(2);
            expect(catchStreamExecutor.lastCall.calledWith(sinon.match.instanceOf(ObsoleteAStreamError))).to.be.true;
        });

    });

});
