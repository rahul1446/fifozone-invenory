require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const socketConfig = require('./src/config/socket');
const { initJobs } = require('./src/jobs');
const User = require('./src/models/User.model');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Seed default administrator if none exist
const seedAdminUser = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const admin = new User({
        name: 'Fifozone Admin',
        email: 'admin@fifozone.com',
        password: 'adminpassword', // automatically hashed in pre-save hook
        role: 'admin',
        phone: '9988776655',
        isActive: true,
        receiveEmailAlerts: true,
        receiveWhatsAppAlerts: false
      });
      await admin.save();
      logger.info('SEED: Default Admin account successfully created (admin@fifozone.com / adminpassword)');
    }
  } catch (error) {
    logger.error(`SEED: Admin creation failed: ${error.message}`);
  }
};

const startServer = async () => {
  // Connect Mongoose
  await connectDB();

  // Seed Admin Account
  await seedAdminUser();

  // Socket.io initialization
  socketConfig.init(server);

  // Background cron jobs initialization
  initJobs();

  // Listen
  server.listen(PORT, () => {
    logger.info(`Fifozone server listening on port: ${PORT} [Mode: ${process.env.NODE_ENV}]`);
  });
};

startServer().catch(err => {
  logger.error(`Server failed to start: ${err.message}`);
  process.exit(1);
});
