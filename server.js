const express = require("express");
const cors = require("cors");
const syncDatabase = require("./sync");
const path = require("path");
const dashboardRouter = require("./routes/reference");

const port = 3060;

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

(async () => {
  await syncDatabase();

  app.use("/api/reference", dashboardRouter);

  app.listen(port, () => {
    console.log(`Server is running with port ${port}`);
  });
})();
