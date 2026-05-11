// Smoke tests: verify each Sequelize model loads correctly with the expected
// table name and primary key. We don't hit the database — sequelize.define()
// just registers the model.
import {
    User, Dataset, Feature, Feature_Property, Dataset_Metadata,
    Region, City, District, Project, Dataset_Project,
} from '../index.js';

const cases = [
    ['User', User, 'User', 'id'],
    ['Dataset', Dataset, 'Dataset', 'id'],
    ['Feature', Feature, 'Feature', 'feature_id'],
    ['Feature_Property', Feature_Property, 'Feature_Property', 'feature_id'],
    ['Dataset_Metadata', Dataset_Metadata, 'Dataset_Metadata', 'dataset_id'],
    ['Region', Region, 'regions'],
    ['City', City, 'cities'],
    ['District', District, 'districts'],
    ['Project', Project, 'Project', 'id'],
    ['Dataset_Project', Dataset_Project, 'Dataset_Project'],
];

describe('models smoke tests', () => {
    it.each(cases)('%s defines a Sequelize model', (_, model) => {
        expect(model).toBeDefined();
        expect(typeof model.findAll).toBe('function');
        expect(typeof model.create).toBe('function');
    });

    it.each(cases)('%s uses tableName "%s"', (_, model, tableName) => {
        expect(model.getTableName()).toEqual(
            expect.objectContaining({ tableName })
        );
    });

    it('defines all expected associations', () => {
        // sample a few associations declared in models/index.js
        expect(Dataset.associations).toHaveProperty('features');
        expect(Dataset.associations).toHaveProperty('owner');
        expect(Dataset.associations).toHaveProperty('metadata');
        expect(Project.associations).toHaveProperty('owner');
        expect(Project.associations).toHaveProperty('datasets');
        expect(Region.associations).toHaveProperty('cities');
        expect(City.associations).toHaveProperty('region');
        expect(District.associations).toHaveProperty('region');
        expect(District.associations).toHaveProperty('city');
    });
});
