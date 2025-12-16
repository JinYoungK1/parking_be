const sequelize = require("./config/database");
const Parking = require("./models/Parking");
const ParkingLot = require("./models/ParkingLot");
const logger = require("./logs/logger");


const errorMessage = err => {
  if (typeof err === "string") {
    return err;
  } else if (err && err.message) {
    return err.message;
  } else {
    return "An unknown error occurred";
  }
};


const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Connection has been established successfully");

    // await sequelize.sync({ force: true });
    await sequelize.sync({});
    logger.info("All models were synchronized successfully");

  } catch (error) {
    console.log(error);
    logger.error("Unable to connect to the database: " + error);
  }
};

module.exports = syncDatabase;
