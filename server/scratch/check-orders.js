require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Order = require('../src/models/Order.model');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const orders = await Order.find({ platform: 'fifozone' }).sort({ createdAt: -1 }).limit(5);
    console.log(JSON.stringify(orders, null, 2));
    
    const vishal = await Order.findOne({ platformOrderId: "1497" });
    console.log("Vishal order 1497:", vishal ? vishal.orderNumber : "NOT FOUND");
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit();
}
test();
