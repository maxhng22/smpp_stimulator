const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./utils/config");
const userController = require("./controllers/userController");
const messageController = require("./controllers/messageController");
const configController = require("./controllers/configController");
const smppService = require("./services/smppService");
const logger = require("./utils/logger");
const app = express();
require("dotenv").config();

const jwt = require("jsonwebtoken");

// require('dotenv').config()

app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB

mongoose
  .connect(process.env.MONGODB_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
  })
  .then(() => {
    logger.info("Connected to MongoDBssssss");
  })
  .catch((err) => {
    logger.error("Failed to connect to MongoDB", err);
  });

// Middleware to authenticate JWT token
const authenticate = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    console.log("token", token);
    return res.status(401).json({ message: "Access denied" });
  }
  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );

    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid token" });
  }
};

app.post("/api/register", userController.register);
app.post("/api/login", userController.login);
app.post("/api/saveconfig", authenticate, configController.saveConfig);
app.get("/api/getconfig", authenticate, configController.getConfig);


app.post("/api/send-message", messageController.sendMessage);
app.post("/api/connectsmpp", messageController.connectSMPP);
app.post("/api/disconnectsmpp", messageController.disconnectSMPP);
app.post("/api/txonlysmpp", messageController.txonlysmpp);
app.post("/api/rxonlysmpp", messageController.rxonlysmpp);
app.post("/api/loadtest", messageController.loadTestSMPP);


app.get(
  "/api/smppConnection",
  messageController.getSMPPConnectionStatus
);
app.post("/api/submit-message", authenticate, messageController.submitMessage);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
