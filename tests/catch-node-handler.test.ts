import {AStreamSource} from '../src';
import * as chai from 'chai';

const {expect} = chai;

async function expectRejected(promise) {
    try {
        await promise;
        expect.fail("Promise should have been rejected");
    } catch (reason) {
        return reason;
    }
}

describe('CatchNode', () => {

    describe('.catch()', () => {
        it('can chain together 2 streams', async () => {
            const sourceStream = new AStreamSource<[boolean], string>((x: boolean) => {
                if (x) {
                    return 'success';
                } else {
                    throw 'error';
                }
            });
            const caughtStream = sourceStream.catch(x => `caught: ${x}`);

            let result = await sourceStream(true);
            expect(result).to.equal('success');

            result = await caughtStream(true);
            expect(result).to.equal('success');

            let reason = await expectRejected(sourceStream(false));
            expect(reason).to.equal('error');

            reason = await caughtStream(false);
            expect(reason).to.equal('caught: error');
        });
    });

});
