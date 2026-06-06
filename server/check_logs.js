require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.useDb('fifozone');
  const logs = await db.collection('inventorylogs').find().toArray();
  
  console.log(`Total logs: ${logs.length}`);
  if (logs.length > 0) {
    console.log("Sample logs:");
    logs.slice(0, 5).forEach(l => console.log(l.changeType, l.note, l.createdAt));
    logs.slice(-5).forEach(l => console.log(l.changeType, l.note, l.createdAt));
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
