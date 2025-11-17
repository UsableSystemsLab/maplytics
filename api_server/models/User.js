import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

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
// User model definition
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      field: "user_id",
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      field: "email",
      unique: true,
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      field: "first_name",
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),
      field: "last_name",
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("Admin", "User"),
      defaultValue: "User",
      field: "role",
      allowNull: false,
    },
  },
  {
    tableName: "User",
    schema: "public",
    timestamps: true, //TODO: Enable timestamps after adding created_at and updated_at fields to the table ✅
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default User;
