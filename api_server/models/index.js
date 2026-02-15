import User from './User.js';
import Dataset from './Dataset.js';
import Feature from './Feature.js';
import Feature_Property from './Feature_Property.js';
import Dataset_Metadata from './Dataset_Metadata.js';

// Define associations between models

// Dataset has many Features
Dataset.hasMany(Feature, {
    foreignKey: 'dataset_id',
    as: 'features',
    onDelete: 'CASCADE'
});

// Feature belongs to Dataset
Feature.belongsTo(Dataset, {
    foreignKey: 'dataset_id',
    as: 'dataset'
});

// Feature has one Feature_Property (one-to-one) "Feature_property is a multi-value attribute"
Feature.hasOne(Feature_Property, {
    foreignKey: 'feature_id',
    as: 'properties',
    onDelete: 'CASCADE'
});

// Feature_Property belongs to Feature  
Feature_Property.belongsTo(Feature, {
    foreignKey: 'feature_id',
    as: 'feature'
});

// Dataset has one Dataset_Metadata (one-to-one)
Dataset.hasOne(Dataset_Metadata, {
    foreignKey: 'dataset_id',
    as: 'metadata',
    onDelete: 'CASCADE'
});

Dataset_Metadata.belongsTo(Dataset, {
    foreignKey: 'dataset_id',
    as: 'dataset'
});

// User has many Datasets
User.hasMany(Dataset, {
    foreignKey: 'user_id',
    as: 'datasets',
    onDelete: 'CASCADE'
});

Dataset.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner'
});

export { User, Dataset, Feature, Feature_Property, Dataset_Metadata };
