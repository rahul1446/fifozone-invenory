require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.useDb('fifozone');
  // Dummy data has no 'items' array or it's missing the new schema fields
  // Let's delete where supplier is NOT 'new medicos' or where items array is empty/missing
  const result = await db.collection('purchases').deleteMany({
    $or: [
      { items: { $exists: false } },
      { items: { $size: 0 } },
      { supplier: { $ne: 'new medicos' } }
    ]
  });
  console.log('Deleted old purchases from Atlas. Count:', result.deletedCount);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
