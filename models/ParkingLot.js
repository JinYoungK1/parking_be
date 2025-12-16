const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ParkingLot = sequelize.define(
  "ParkingLot",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    total_spaces: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "전체 주차 공간 수",
    },
    occupied_spaces: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "입차 수",
    },
    available_spaces: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "남은 공간 수",
    },
    price_per_hour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "설정 가격 (시간당)",
    },
    price_per_minute: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "설정 가격 (분당)",
    },
    setting_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
      comment: "설정 시간 (분 단위)",
    },
  },
  {
    tableName: "parking_lot",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

module.exports = ParkingLot;

