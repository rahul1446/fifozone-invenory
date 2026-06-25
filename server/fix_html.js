const mongoose = require('mongoose');
require('dotenv').config();

const decodeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = require('./src/models/Product.model');
  const Order = require('./src/models/Order.model');

  const products = await Product.find({});
  let pCount = 0;
  for(let p of products) {
    const n = decodeHtml(p.masterName);
    if(n !== p.masterName) {
      p.masterName = n;
      await p.save();
      pCount++;
    }
  }

  const orders = await Order.find({});
  let oCount = 0;
  for(let o of orders) {
    let changed = false;
    o.items.forEach(i => {
      const n = decodeHtml(i.name);
      if(n !== i.name) {
        i.name = n;
        changed = true;
      }
    });
    if(changed) {
      await o.save();
      oCount++;
    }
  }

  console.log('Fixed', pCount, 'products and', oCount, 'orders.');
  process.exit(0);
}).catch(console.error);
