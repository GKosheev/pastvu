import { AuthenticationError } from '../';
import constants from '../constants';
import errorMsgs from '../intl';

describe('authenticationError test', () => {
    it('should throw default message', () => {
        expect(() => {
            throw new AuthenticationError();
        }).toThrow(errorMsgs[constants.AUTHENTICATION]);
    });

    it('should throw custom message', () => {
        expect(() => {
            throw new AuthenticationError('foo');
        }).toThrow('foo');
    });

    it('should contain correct status code', () => {
        const error = new AuthenticationError();

        expect(error).toHaveProperty('statusCode', 401);
    });
});
