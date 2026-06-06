require('dotenv').config();
const mongoose = require('mongoose');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const PlatformCredential = require('./src/models/PlatformCredential.model');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const creds = await PlatformCredential.findOne({ platform: 'fifozone' });
    if (!creds) {
      console.log('No credentials found in database.');
      process.exit(0);
    }
    console.log('Found Credentials for:', creds.credentials.storeUrl);
    
    // Test without index.php
    const api1 = new WooCommerceRestApi({
      url: creds.credentials.storeUrl,
      consumerKey: creds.credentials.consumerKey,
      consumerSecret: creds.credentials.consumerSecret,
      version: 'wc/v3',
      queryStringAuth: true
    });

    console.log('Testing connection with exact URL (no index.php)...');
    try {
      const res1 = await api1.get('orders', { per_page: 1 });
      console.log('typeof data:', typeof res1.data);
      console.log('Data summary:', String(res1.data).slice(0, 500));
    } catch (err) {
      console.log('FAILED with exact URL:', err.response?.status, err.response?.data || err.message);
    }

    // Test with index.php
    const baseUrl = creds.credentials.storeUrl.replace(/\/$/, '');
    const api2 = new WooCommerceRestApi({
      url: `${baseUrl}/index.php`,
      consumerKey: creds.credentials.consumerKey,
      consumerSecret: creds.credentials.consumerSecret,
      version: 'wc/v3',
      queryStringAuth: true
    });

    console.log('\nTesting connection WITH index.php...');
    try {
      const res2 = await api2.get('orders', { per_page: 1 });
      console.log('SUCCESS! Orders found:', res2.data.length);
    } catch (err) {
      console.log('FAILED WITH index.php:', err.response?.status, err.response?.data || err.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
});
