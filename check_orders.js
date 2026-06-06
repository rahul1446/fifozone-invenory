const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/fifozone').then(async () => {
  const db = mongoose.connection.db;
  const count = await db.collection('orders').countDocuments();
  const fzCount = await db.collection('orders').countDocuments({ orderNumber: { $regex: '^FI-ORD' } });
  const wooCount = await db.collection('orders').countDocuments({ orderNumber: { $regex: '^#OD' } });
  console.log('Total Orders:', count);
  console.log('Dummy FI-ORD:', fzCount);
  console.log('WooCommerce #OD:', wooCount);
  process.exit(0);
});
