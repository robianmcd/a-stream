import {EventStream} from '../src';
import * as chai from 'chai';

const {expect} = chai;


describe('EventStream', () => {

    describe('constructor()', () => {
        it('supports multiple parameters', async () => {
            const stream = new EventStream((x: number, y: number, z: number) => x + y + z);

            let result = await stream(5, 10, 100);
            expect(result).to.equal(115);
        });

    });

});
