import User from './User.js';
import Dataset from './Dataset.js';
import Feature from './Feature.js';
import Feature_Property from './Feature_Property.js';
import Dataset_Metadata from './Dataset_Metadata.js';
import Region from './Region.js';
import City from './City.js';
import District from './District.js';
import Project from './Project.js';
import Dataset_Project from './Dataset_Project.js';
import User_Dataset_Filter_Prefs from './User_Dataset_Filter_Prefs.js';

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

// Dataset has many User_Dataset_Filter_Prefs (one row per user who has overridden the default)
Dataset.hasMany(User_Dataset_Filter_Prefs, {
    foreignKey: 'dataset_id',
    as: 'userFilterPrefs',
    onDelete: 'CASCADE'
});

User_Dataset_Filter_Prefs.belongsTo(Dataset, {
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

// Project <-> Dataset many-to-many
Project.belongsToMany(Dataset, {
    through: Dataset_Project,
    foreignKey: 'project_id',
    otherKey: 'dataset_id',
    as: 'datasets'
});

Dataset.belongsToMany(Project, {
    through: Dataset_Project,
    foreignKey: 'dataset_id',
    otherKey: 'project_id',
    as: 'projects'
});


// User has many Projects
User.hasMany(Project, {
    foreignKey: 'user_id',
    as: 'projects',
    onDelete: 'CASCADE'
});

// Project belongs to User
Project.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner'
});

// Region has many Cities
Region.hasMany(City, {
    foreignKey: 'region_id',
    as: 'cities',
});

// City belongs to Region
City.belongsTo(Region, {
    foreignKey: 'region_id',
    as: 'region',
});

// Region has many Districts
Region.hasMany(District, {
    foreignKey: 'region_id',
    as: 'districts',
});

// District belongs to Region
District.belongsTo(Region, {
    foreignKey: 'region_id',
    as: 'region',
});

// City has many Districts
City.hasMany(District, {
    foreignKey: 'city_id',
    as: 'districts',
});

// District belongs to City
District.belongsTo(City, {
    foreignKey: 'city_id',
    as: 'city',
});

export { User, Dataset, Feature, Feature_Property, Dataset_Metadata, Region, City, District, Project, Dataset_Project, User_Dataset_Filter_Prefs };
