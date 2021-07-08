import {AStream} from '../src';
import * as chai from 'chai';

const {expect} = chai;


describe('CombineNode', () => {

    describe('.combine()', () => {
        it('can chain together 2 streams', async () => {
            const stream1 = new AStream((x: number) => x);
            const stream2 = new AStream((x: string) => x);

            stream1.combine([stream2])
                .next(result => console.log(result));

            stream1(1);
            stream1(2);
            stream1(3);
            stream2('a');
            stream2('b');
            stream1(4);

            // expect(result).to.equal('$16');
        });

    });

});
