const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const PlatformCredential = require('./src/models/PlatformCredential.model');

  const cred = await PlatformCredential.findOne({ platform: 'fifozone' });
  if (!cred || !cred.credentials) {
    console.log('No WooCommerce credentials found');
    process.exit(0);
  }

  const client = new WooCommerceRestApi({
    url: cred.credentials.storeUrl,
    consumerKey: cred.credentials.consumerKey,
    consumerSecret: cred.credentials.consumerSecret,
    version: 'wc/v3'
  });

  const response = await client.get('products', { search: 'Farmina Vet Life Fish', per_page: 1 });
  const batch = response.data;
  if (!batch || batch.length === 0) {
    console.log('Product not found');
  } else {
    const prod = batch[0];
    console.log('--- WC DESCRIPTION ---');
    console.log(prod.description);
  }
  process.exit(0);
}).catch(console.error);
