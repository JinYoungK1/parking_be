const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Parking = sequelize.define(
  "Parking",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    car_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "차량 번호",
    },
    entry_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "입차 시간",
    },
    exit_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "출차 시간",
    },
  },
  {
    tableName: "parking",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

module.exports = Parking;

