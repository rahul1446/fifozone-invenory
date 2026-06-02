const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fifozone';
    const conn = await mongoose.connect(mongoURI);
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection failure: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
