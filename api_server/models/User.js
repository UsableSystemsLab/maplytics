import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - email
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the user (Firebase UID).
 *           example: "xC9jTEIaficN5qJe9RdW01mmHi02"
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email address.
 *           example: "user@example.com"
 *         first_name:
 *           type: string
 *           description: The user's first name.
 *           example: "John"
 *         last_name:
 *           type: string
 *           description: The user's last name.
 *           example: "Doe"
 *         role:
 *           type: string
 *           enum: [Admin, User]
 *           default: User
 *           description: The user's role in the system.
 *           example: "User"
 */
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.STRING(128),
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
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default User;
