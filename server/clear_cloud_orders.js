require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const count = await db.collection('orders').countDocuments();
  console.log('Total Orders before delete:', count);
  
  const result = await db.collection('orders').deleteMany({ orderNumber: { $regex: '^FI-ORD' } });
  console.log(`Deleted ${result.deletedCount} dummy orders`);
  
  const newCount = await db.collection('orders').countDocuments();
  console.log('Total Orders after delete:', newCount);
  
  process.exit(0);
}).catch(err => {
  console.error('Error connecting to MongoDB Atlas:', err);
  process.exit(1);
});
