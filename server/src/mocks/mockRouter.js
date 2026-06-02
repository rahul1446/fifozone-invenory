const express = require('express');
const router = express.Router();
const amazonRouter   = require('./amazon/amazon.router');
const flipkartRouter = require('./flipkart/flipkart.router');
const meeshoRouter   = require('./meesho/meesho.router');

router.use('/amazon',   amazonRouter);
router.use('/flipkart', flipkartRouter);
router.use('/meesho',   meeshoRouter);

module.exports = router;
