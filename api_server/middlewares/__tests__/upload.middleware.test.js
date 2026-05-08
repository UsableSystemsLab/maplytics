import { jest } from '@jest/globals';

jest.unstable_mockModule('multer', () => {
    return {
        default: jest.fn((options) => options)
    };
});

jest.unstable_mockModule('multer-s3', () => {
    return {
        default: jest.fn((options) => options)
    };
});

jest.unstable_mockModule('../../configs/s3Client.js', () => {
    return {
        s3Client: {},
        BUCKET_NAME: 'test-bucket'
    };
});

describe('upload.middleware.js', () => {
    let uploadPublic;
    let uploadPrivate;

    beforeAll(async () => {
        const mod = await import('../upload.middleware.js');
        uploadPublic = mod.uploadPublic;
        uploadPrivate = mod.uploadPrivate;
    });

    it('should allow valid extensions in fileFilter', () => {
        const cb = jest.fn();
        uploadPublic.fileFilter({}, { originalname: 'data.json' }, cb);
        expect(cb).toHaveBeenCalledWith(null, true);

        uploadPublic.fileFilter({}, { originalname: 'data.geojson' }, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject invalid extensions in fileFilter', () => {
        const cb = jest.fn();
        uploadPublic.fileFilter({}, { originalname: 'data.txt' }, cb);
        expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should generate correct metadata for public and private uploads', () => {
        const cbPublic = jest.fn();
        uploadPublic.storage.metadata({}, { fieldname: 'fileData' }, cbPublic);
        expect(cbPublic).toHaveBeenCalledWith(null, { fieldName: 'fileData' });

        const cbPrivate = jest.fn();
        uploadPrivate.storage.metadata({}, { fieldname: 'fileData' }, cbPrivate);
        expect(cbPrivate).toHaveBeenCalledWith(null, { fieldName: 'fileData' });
    });

    it('should generate correct key for public uploads', () => {
        const cb = jest.fn();
        uploadPublic.storage.key({}, { originalname: 'data.json' }, cb);
        expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/^public\/\d+-data\.json$/));
    });

    it('should generate correct key for private uploads with userId', () => {
        const cb = jest.fn();
        uploadPrivate.storage.key({ userId: 'user123' }, { originalname: 'data.json' }, cb);
        expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/^private\/user123\/\d+-data\.json$/));
    });

    it('should generate correct key for private uploads without userId', () => {
        const cb = jest.fn();
        uploadPrivate.storage.key({}, { originalname: 'data.json' }, cb);
        expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/^private\/unassigned\/\d+-data\.json$/));
    });
});
