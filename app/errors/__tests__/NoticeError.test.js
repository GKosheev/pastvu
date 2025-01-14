import { NoticeError } from '../';
import constants from '../constants';
import errorMsgs from '../intl';

describe('noticeError', () => {
    it('should throw default message', () => {
        expect(() => {
            throw new NoticeError();
        }).toThrow(errorMsgs[constants.NOTICE]);
    });

    it('should throw custom message', () => {
        expect(() => {
            throw new NoticeError('foo');
        }).toThrow('foo');
    });

    it('should contain correct status code', () => {
        const error = new NoticeError();

        expect(error).toHaveProperty('statusCode', 200);
    });
});
