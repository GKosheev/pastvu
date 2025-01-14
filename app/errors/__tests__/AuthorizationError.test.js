import { AuthorizationError } from '../';
import constants from '../constants';
import errorMsgs from '../intl';

describe('authorizationError test', () => {
    it('should throw default message', () => {
        expect(() => {
            throw new AuthorizationError();
        }).toThrow(errorMsgs[constants.DENY]);
    });

    it('should throw custom message', () => {
        expect(() => {
            throw new AuthorizationError('foo');
        }).toThrow('foo');
    });

    it('should contain correct status code', () => {
        const error = new AuthorizationError();

        expect(error).toHaveProperty('statusCode', 403);
    });
});
