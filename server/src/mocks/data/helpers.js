const { products } = require('./products.data');
const { customers } = require('./customers.data');

function generateAmazonOrderId() {
  const p1 = Math.floor(100 + Math.random() * 900);
  const p2 = Math.floor(1000000 + Math.random() * 9000000);
  const p3 = Math.floor(1000000 + Math.random() * 9000000);
  return `${p1}-${p2}-${p3}`;
}

function generateFlipkartOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'OD';
  for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3600000).toISOString();
}

function randomCustomer() {
  return customers[Math.floor(Math.random() * customers.length)];
}

function randomProduct() {
  return products[Math.floor(Math.random() * products.length)];
}

function getProductByAsin(asin) {
  return products.find(p => p.amazonAsin === asin) || products[0];
}

function getProductByFsin(fsin) {
  return products.find(p => p.flipkartFsin === fsin) || products[0];
}

function getProductBySku(sku) {
  return products.find(p => p.internalSku === sku) || products[0];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function amazonAddr(customer) {
  const a = customer.address;
  return {
    Name: customer.name,
    AddressLine1: a.line1,
    AddressLine2: a.line2 || '',
    City: a.city,
    StateOrRegion: a.state,
    PostalCode: a.pincode,
    CountryCode: 'IN',
    Phone: customer.phone,
    AddressType: 'Residential',
  };
}

function flipkartAddr(customer) {
  const a = customer.address;
  return {
    name: customer.name,
    addressLine1: a.line1,
    addressLine2: a.line2 || '',
    city: a.city,
    state: a.state,
    pinCode: a.pincode,
    country: 'INDIA',
    phone: customer.phone,
  };
}

module.exports = {
  generateAmazonOrderId, generateFlipkartOrderId,
  daysAgo, daysFromNow, hoursAgo,
  randomCustomer, randomProduct,
  getProductByAsin, getProductByFsin, getProductBySku,
  randomInt, amazonAddr, flipkartAddr,
};
