'use strict';

const meeshoOrders = [
  { order_id: 'MSH-ORD-5001', supplier_sku: 'FIP-SPOT-001',       quantity: 2, selling_price: 299,  customer_name: 'Sunita Sharma',  city: 'Jaipur',    state: 'Rajasthan',    pincode: '302001', payment_mode: 'Prepaid', status: 'CONFIRMED',  created_at: new Date(Date.now() - 86400000).toISOString() },
  { order_id: 'MSH-ORD-5002', supplier_sku: 'NOOT-SHMP-001',       quantity: 1, selling_price: 499,  customer_name: 'Kavya Reddy',    city: 'Hyderabad', state: 'Telangana',    pincode: '500001', payment_mode: 'COD',     status: 'PENDING',    created_at: new Date(Date.now() - 172800000).toISOString() },
  { order_id: 'MSH-ORD-5003', supplier_sku: 'PED-ADT-CHKN-001',    quantity: 1, selling_price: 699,  customer_name: 'Arjun Nair',     city: 'Kochi',     state: 'Kerala',       pincode: '682001', payment_mode: 'Prepaid', status: 'SHIPPED',    created_at: new Date(Date.now() - 259200000).toISOString() },
  { order_id: 'MSH-ORD-5004', supplier_sku: 'HIM-ERINA-001',        quantity: 3, selling_price: 189,  customer_name: 'Preethi Menon',  city: 'Chennai',   state: 'Tamil Nadu',   pincode: '600001', payment_mode: 'Prepaid', status: 'CONFIRMED',  created_at: new Date(Date.now() - 43200000).toISOString() },
  { order_id: 'MSH-ORD-5005', supplier_sku: 'WIS-CHICK-JELLY-001',  quantity: 5, selling_price: 85,   customer_name: 'Rohan Gupta',    city: 'Lucknow',   state: 'Uttar Pradesh',pincode: '226001', payment_mode: 'COD',     status: 'DELIVERED',  created_at: new Date(Date.now() - 432000000).toISOString() },
  { order_id: 'MSH-ORD-5006', supplier_sku: 'RC-CAT-HAIR-001',      quantity: 1, selling_price: 1699, customer_name: 'Meera Iyer',     city: 'Bengaluru', state: 'Karnataka',    pincode: '560001', payment_mode: 'Prepaid', status: 'CONFIRMED',  created_at: new Date(Date.now() - 21600000).toISOString() },
  { order_id: 'MSH-ORD-5007', supplier_sku: 'VIV-OMEG-001',         quantity: 2, selling_price: 459,  customer_name: 'Rahul Dubey',    city: 'Bhopal',    state: 'Madhya Pradesh',pincode: '462001', payment_mode: 'COD',     status: 'PENDING',    created_at: new Date(Date.now() - 7200000).toISOString() },
];

module.exports = { meeshoOrders };
