const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger');

// Force Node.js to use Google DNS for SRV record resolution (system DNS may not support SRV)
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
