import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: '123e4567-e89b-12d3-a456-426614174000'
 *         user_name:
 *           type: string
 *           example: 'kalharbi'
 *         email:
 *           type: string
 *           example: 'kalharbi@example.com'
 *         phone:
 *           type: string
 *           example: '+9661234567890'
 */

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.STRING(255),
      field: "user_id",
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      field: "email",
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(255),
      field: "first_name",
      allowNull: true,
    },
    middle_name:{
      type: DataTypes.STRING(255),
      field: "middle_name",
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(255),
      field: "last_name",
      allowNull: true,
    }
  },
  {
    tableName: "User",
    schema: "public",
    timestamps: false, //TODO: Enable timestamps after adding created_at and updated_at fields to the table
  },
);

export default User;
