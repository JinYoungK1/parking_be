const express = require("express");
const router = express.Router();
const path = require("path");
const sequelize = require("../../config/database");
const Joi = require("joi");
const { Op, QueryTypes } = require("sequelize");

const logger = require("../../logs/logger");
const dotenv = require("dotenv");
dotenv.config();

const Parking = require("../../models/Parking");
const ParkingLot = require("../../models/ParkingLot");

const errorMessage = err => {
  if (typeof err === "string") {
    return err;
  } else if (err && err.message) {
    return err.message;
  } else {
    return "An unknown error occurred";
  }
};

// 주차장 상태 조회
router.get("/parking/status", async (req, res) => {
  try {
    // 주차장 정보 조회 (없으면 기본값으로 생성)
    let parkingLot = await ParkingLot.findOne();
    if (!parkingLot) {
      parkingLot = await ParkingLot.create({
        total_spaces: 0,
        occupied_spaces: 0,
        available_spaces: 0,
        price_per_hour: 0,
        price_per_minute: 0,
        setting_time: 60,
      });
    }

    // 현재 주차 중인 차량 수 계산 (출차 시간이 null인 차량)
    const currentParkedCount = await Parking.count({
      where: {
        exit_time: null,
      },
    });

    // 주차장 정보 업데이트 (실제 주차 중인 차량 수 반영)
    parkingLot.occupied_spaces = currentParkedCount;
    parkingLot.available_spaces = parkingLot.total_spaces - currentParkedCount;
    await parkingLot.save();

    res.json({
      result: true,
      message: "주차장 상태 조회 성공",
      data: {
        total_spaces: parkingLot.total_spaces,
        occupied_spaces: parkingLot.occupied_spaces,
        available_spaces: parkingLot.available_spaces,
        price_per_hour: parkingLot.price_per_hour,
        price_per_minute: parkingLot.price_per_minute,
        setting_time: parkingLot.setting_time,
      },
    });
  } catch (error) {
    logger.error("주차장 상태 조회 실패: " + errorMessage(error));
    res.status(500).json({
      result: false,
      message: "주차장 상태 조회 실패",
      error: errorMessage(error),
    });
  }
});

// 주차장 정보 설정/수정
router.post("/parking/lot", async (req, res) => {
  try {
    const schema = Joi.object({
      total_spaces: Joi.number().integer().min(0).required(),
      price_per_hour: Joi.number().min(0).required(),
      price_per_minute: Joi.number().min(0).optional(),
      setting_time: Joi.number().integer().min(1).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        result: false,
        message: "입력값 검증 실패",
        error: error.details[0].message,
      });
    }

    let parkingLot = await ParkingLot.findOne();
    const currentParkedCount = await Parking.count({
      where: {
        exit_time: null,
      },
    });

    if (parkingLot) {
      // 기존 정보 업데이트
      parkingLot.total_spaces = value.total_spaces;
      parkingLot.price_per_hour = value.price_per_hour;
      parkingLot.price_per_minute = value.price_per_minute || 0;
      parkingLot.setting_time = value.setting_time || 60;
      parkingLot.occupied_spaces = currentParkedCount;
      parkingLot.available_spaces = value.total_spaces - currentParkedCount;
      await parkingLot.save();
    } else {
      // 새로 생성
      parkingLot = await ParkingLot.create({
        total_spaces: value.total_spaces,
        occupied_spaces: currentParkedCount,
        available_spaces: value.total_spaces - currentParkedCount,
        price_per_hour: value.price_per_hour,
        price_per_minute: value.price_per_minute || 0,
        setting_time: value.setting_time || 60,
      });
    }

    logger.info("주차장 정보 설정 성공");
    res.json({
      result: true,
      message: "주차장 정보 설정 성공",
      data: parkingLot,
    });
  } catch (error) {
    logger.error("주차장 정보 설정 실패: " + errorMessage(error));
    res.status(500).json({
      result: false,
      message: "주차장 정보 설정 실패",
      error: errorMessage(error),
    });
  }
});

// 입차 등록
router.post("/parking/entry", async (req, res) => {
  try {
    const schema = Joi.object({
      car_number: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        result: false,
        message: "입력값 검증 실패",
        error: error.details[0].message,
      });
    }

    // 이미 주차 중인 차량인지 확인
    const existingParking = await Parking.findOne({
      where: {
        car_number: value.car_number,
        exit_time: null,
      },
    });

    if (existingParking) {
      return res.status(400).json({
        result: false,
        message: "이미 주차 중인 차량입니다",
      });
    }

    // 주차장 정보 확인
    const parkingLot = await ParkingLot.findOne();
    if (!parkingLot) {
      return res.status(400).json({
        result: false,
        message: "주차장 정보가 설정되지 않았습니다",
      });
    }

    // 현재 주차 중인 차량 수 확인
    const currentParkedCount = await Parking.count({
      where: {
        exit_time: null,
      },
    });

    if (currentParkedCount >= parkingLot.total_spaces) {
      return res.status(400).json({
        result: false,
        message: "주차 공간이 부족합니다",
      });
    }

    // 입차 등록
    const parking = await Parking.create({
      car_number: value.car_number,
      entry_time: new Date(),
      exit_time: null,
    });

    // 주차장 정보 업데이트
    parkingLot.occupied_spaces = currentParkedCount + 1;
    parkingLot.available_spaces = parkingLot.total_spaces - (currentParkedCount + 1);
    await parkingLot.save();

    logger.info(`입차 등록 성공: ${value.car_number}`);
    res.json({
      result: true,
      message: "입차 등록 성공",
      data: parking,
    });
  } catch (error) {
    logger.error("입차 등록 실패: " + errorMessage(error));
    res.status(500).json({
      result: false,
      message: "입차 등록 실패",
      error: errorMessage(error),
    });
  }
});

// 출차 등록
router.post("/parking/exit", async (req, res) => {
  try {
    const schema = Joi.object({
      car_number: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        result: false,
        message: "입력값 검증 실패",
        error: error.details[0].message,
      });
    }

    // 주차 중인 차량 찾기
    const parking = await Parking.findOne({
      where: {
        car_number: value.car_number,
        exit_time: null,
      },
    });

    if (!parking) {
      return res.status(404).json({
        result: false,
        message: "주차 중인 차량을 찾을 수 없습니다",
      });
    }

    // 출차 시간 등록
    parking.exit_time = new Date();
    await parking.save();

    // 주차장 정보 업데이트
    const parkingLot = await ParkingLot.findOne();
    if (parkingLot) {
      const currentParkedCount = await Parking.count({
        where: {
          exit_time: null,
        },
      });
      parkingLot.occupied_spaces = currentParkedCount;
      parkingLot.available_spaces = parkingLot.total_spaces - currentParkedCount;
      await parkingLot.save();
    }

    // 주차 시간 계산 (분 단위)
    const entryTime = new Date(parking.entry_time);
    const exitTime = new Date(parking.exit_time);
    const parkingMinutes = Math.ceil((exitTime - entryTime) / (1000 * 60));

    logger.info(`출차 등록 성공: ${value.car_number}, 주차 시간: ${parkingMinutes}분`);
    res.json({
      result: true,
      message: "출차 등록 성공",
      data: {
        ...parking.toJSON(),
        parking_minutes: parkingMinutes,
      },
    });
  } catch (error) {
    logger.error("출차 등록 실패: " + errorMessage(error));
    res.status(500).json({
      result: false,
      message: "출차 등록 실패",
      error: errorMessage(error),
    });
  }
});

// 현재 주차 중인 차량 목록 조회
router.get("/parking/current", async (req, res) => {
  try {
    const parkedCars = await Parking.findAll({
      where: {
        exit_time: null,
      },
      order: [["entry_time", "DESC"]],
    });

    res.json({
      result: true,
      message: "현재 주차 중인 차량 목록 조회 성공",
      data: parkedCars,
    });
  } catch (error) {
    logger.error("주차 중인 차량 목록 조회 실패: " + errorMessage(error));
    res.status(500).json({
      result: false,
      message: "주차 중인 차량 목록 조회 실패",
      error: errorMessage(error),
    });
  }
});

// 주차 이력 조회
router.get("/parking/history", async (req, res) => {
  try {
    const { car_number, start_date, end_date, page = 1, limit = 20 } = req.query;

    const where = {};
    if (car_number) {
      where.car_number = car_number;
    }
    if (start_date && end_date) {
      where.entry_time = {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Parking.findAndCountAll({
      where,
      order: [["entry_time", "DESC"]],
      limit: parseInt(limit),
      offset: offset,
    });

    res.json({
      result: true,
      message: "주차 이력 조회 성공",
      data: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        items: rows,
      },
    });
  } catch (error) {
    logger.error("주차 이력 조회 실패: " + errorMessage(error));
    res.status(500).json({
      result: false,
      message: "주차 이력 조회 실패",
      error: errorMessage(error),
    });
  }
});

module.exports = router;
