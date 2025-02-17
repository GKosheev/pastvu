import { ApplicationError } from '../';
import constants from '../constants';
import errorMsgs from '../intl';

describe('applicationError test', () => {
    it('should throw default message', () => {
        expect(() => {
            throw new ApplicationError();
        }).toThrow(errorMsgs[constants.UNHANDLED_ERROR]);
    });

    it('should throw custom message', () => {
        expect(() => {
            throw new ApplicationError('foo');
        }).toThrow('foo');
    });

    it('should contain correct status code', () => {
        const error = new ApplicationError();

        expect(error).toHaveProperty('statusCode', 500);
    });
});
