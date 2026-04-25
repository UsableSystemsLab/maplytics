import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";

const User_Dataset_Filter_Prefs = sequelize.define(
    "User_Dataset_Filter_Prefs",
    {
        user_id: {
            type: DataTypes.STRING(128),
            field: "user_id",
            primaryKey: true,
            allowNull: false,
        },
        dataset_id: {
            type: DataTypes.UUID,
            field: "dataset_id",
            primaryKey: true,
            allowNull: false,
            references: { model: "Dataset", key: "dataset_id" },
            onDelete: "CASCADE",
        },
        filterable_fields: {
            type: DataTypes.JSONB,
            field: "filterable_fields",
            allowNull: false,
        },
    },
    {
        tableName: "User_Dataset_Filter_Prefs",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default User_Dataset_Filter_Prefs;
