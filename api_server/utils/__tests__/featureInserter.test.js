import { jest } from '@jest/globals';

const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
};

const mockSequelize = {
    transaction: jest.fn().mockResolvedValue(mockTransaction),
};

const mockDataset = {
    create: jest.fn(),
};

const mockFeature = {
    bulkCreate: jest.fn(),
};

const mockFeatureProperty = {
    bulkCreate: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
};

jest.unstable_mockModule('../../configs/postgresDB.js', () => ({
    sequelize: mockSequelize,
}));

jest.unstable_mockModule('../../models/index.js', () => ({
    Dataset: mockDataset,
    Feature: mockFeature,
    Feature_Property: mockFeatureProperty,
}));

jest.unstable_mockModule('../../configs/logger.js', () => ({
    default: mockLogger,
}));

describe('featureInserter.js', () => {
    let insertFeaturesIntoDB;

    beforeAll(async () => {
        const mod = await import('../featureInserter.js');
        insertFeaturesIntoDB = mod.insertFeaturesIntoDB;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockSequelize.transaction.mockResolvedValue(mockTransaction);
        mockTransaction.commit.mockResolvedValue();
        mockTransaction.rollback.mockResolvedValue();
    });

    it('should successfully create an empty dataset when features list is empty', async () => {
        mockDataset.create.mockResolvedValue({ id: 'dataset-123' });

        const result = await insertFeaturesIntoDB({
            datasetName: 'Empty Dataset',
            description: 'Test empty',
            userId: 'user1',
            fileFormat: 'GeoJSON',
            geojson: { type: 'FeatureCollection', features: [] }
        });

        expect(mockSequelize.transaction).toHaveBeenCalled();
        expect(mockDataset.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Empty Dataset', feature_count: 0 }),
            { transaction: mockTransaction }
        );
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created empty dataset'));
        expect(result).toBe('dataset-123');
    });

    it('should insert features and properties successfully', async () => {
        mockDataset.create.mockResolvedValue({ id: 'dataset-456' });
        mockFeature.bulkCreate.mockResolvedValue([
            { feature_id: 'f-1' },
            { feature_id: 'f-2' }
        ]);
        mockFeatureProperty.bulkCreate.mockResolvedValue();

        const geojson = {
            type: 'FeatureCollection',
            features: [
                { geometry: { type: 'Point', coordinates: [0, 0] }, properties: { name: 'Point A' } },
                { geometry: { type: 'Point', coordinates: [1, 1] }, properties: { name: 'Point B' } },
                { properties: { name: 'No Geometry' } } // should be filtered out
            ]
        };

        const result = await insertFeaturesIntoDB({
            datasetName: 'Valid Dataset',
            userId: 'user2',
            fileFormat: 'GeoJSON',
            geojson
        });

        expect(mockDataset.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Valid Dataset', feature_count: 3 }),
            { transaction: mockTransaction }
        );
        expect(mockFeature.bulkCreate).toHaveBeenCalled();
        expect(mockFeatureProperty.bulkCreate).toHaveBeenCalled();
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Inserted 3 features'));
        expect(result).toBe('dataset-456');
    });

    it('should rollback transaction and return null on error', async () => {
        const error = new Error('Database Error');
        mockDataset.create.mockRejectedValue(error);

        const result = await insertFeaturesIntoDB({
            datasetName: 'Error Dataset',
            userId: 'user3',
            fileFormat: 'GeoJSON',
            geojson: { features: [] }
        });

        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith('[featureInserter] Failed to insert features:', error);
        expect(result).toBeNull();
    });
});
