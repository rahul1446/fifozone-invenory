'use strict';

const {
  daysAgo, daysFromNow,
  flipkartAddr,
} = require('../data/helpers');
const { customers } = require('../data/customers.data');
const { products } = require('../data/products.data');

// ─── Helper to pick a product by index (cyclic) ──────────────────────────────
function prod(i) { return products[i % products.length]; }

// ─── Helper to build a Flipkart order item ───────────────────────────────────
function buildItem(index, product, qty, status, trackingId = null) {
  const unit = product.mrp;
  return {
    orderItemId: `OI-FK-${String(index).padStart(3, '0')}`,
    fsn: product.flipkartFsin,
    sku: product.internalSku,
    quantity: qty,
    title: product.name,
    sellingPrice: { amount: unit, currency: 'INR' },
    totalPrice: { amount: unit * qty, currency: 'INR' },
    orderItemStatus: status,
    logisticsServiceProvider: trackingId ? 'Ekart Logistics' : 'Flipkart Logistics',
    trackingId: trackingId,
  };
}

// ─── 20 Flipkart Orders ──────────────────────────────────────────────────────
const flipkartOrders = [
  // ── 1. APPROVED ──────────────────────────────────────────────────────────
  {
    orderId: 'OD114823647501',
    orderItems: [buildItem(1, prod(0), 2, 'APPROVED')],
    orderDate: daysAgo(0),
    dispatchByDate: daysFromNow(1),
    promisedDeliveryDate: daysFromNow(4),
    state: 'APPROVED',
    amount: { totalAmount: prod(0).mrp * 2, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[5].name, mobile: customers[5].phone, email: customers[5].email },
      shippingAddress: flipkartAddr(customers[5]),
    },
  },

  // ── 2. APPROVED ──────────────────────────────────────────────────────────
  {
    orderId: 'OD229384756102',
    orderItems: [buildItem(2, prod(17), 1, 'APPROVED')],
    orderDate: daysAgo(0),
    dispatchByDate: daysFromNow(1),
    promisedDeliveryDate: daysFromNow(4),
    state: 'APPROVED',
    amount: { totalAmount: prod(17).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[0].name, mobile: customers[0].phone, email: customers[0].email },
      shippingAddress: flipkartAddr(customers[0]),
    },
  },

  // ── 3. APPROVED ──────────────────────────────────────────────────────────
  {
    orderId: 'OD331948572103',
    orderItems: [
      buildItem(3, prod(14), 1, 'APPROVED'),
      buildItem(4, prod(15), 2, 'APPROVED'),
    ],
    orderDate: daysAgo(1),
    dispatchByDate: daysFromNow(1),
    promisedDeliveryDate: daysFromNow(5),
    state: 'APPROVED',
    amount: { totalAmount: prod(14).mrp + prod(15).mrp * 2, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[9].name, mobile: customers[9].phone, email: customers[9].email },
      shippingAddress: flipkartAddr(customers[9]),
    },
  },

  // ── 4. PACKED ────────────────────────────────────────────────────────────
  {
    orderId: 'OD447291038204',
    orderItems: [buildItem(5, prod(10), 1, 'PACKED')],
    orderDate: daysAgo(1),
    dispatchByDate: daysFromNow(0),
    promisedDeliveryDate: daysFromNow(3),
    state: 'PACKED',
    amount: { totalAmount: prod(10).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[3].name, mobile: customers[3].phone, email: customers[3].email },
      shippingAddress: flipkartAddr(customers[3]),
    },
  },

  // ── 5. PACKED ────────────────────────────────────────────────────────────
  {
    orderId: 'OD558203948305',
    orderItems: [buildItem(6, prod(2), 3, 'PACKED')],
    orderDate: daysAgo(1),
    dispatchByDate: daysFromNow(0),
    promisedDeliveryDate: daysFromNow(3),
    state: 'PACKED',
    amount: { totalAmount: prod(2).mrp * 3, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[16].name, mobile: customers[16].phone, email: customers[16].email },
      shippingAddress: flipkartAddr(customers[16]),
    },
  },

  // ── 6. PACKED ────────────────────────────────────────────────────────────
  {
    orderId: 'OD661029485406',
    orderItems: [
      buildItem(7, prod(28), 1, 'PACKED'),
      buildItem(8, prod(25), 2, 'PACKED'),
    ],
    orderDate: daysAgo(2),
    dispatchByDate: daysFromNow(0),
    promisedDeliveryDate: daysFromNow(3),
    state: 'PACKED',
    amount: { totalAmount: prod(28).mrp + prod(25).mrp * 2, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[19].name, mobile: customers[19].phone, email: customers[19].email },
      shippingAddress: flipkartAddr(customers[19]),
    },
  },

  // ── 7. SHIPPED ───────────────────────────────────────────────────────────
  {
    orderId: 'OD774938201507',
    orderItems: [buildItem(9, prod(6), 1, 'SHIPPED', 'FKMP1234567890')],
    orderDate: daysAgo(3),
    dispatchByDate: daysAgo(2),
    promisedDeliveryDate: daysFromNow(1),
    state: 'SHIPPED',
    amount: { totalAmount: prod(6).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[7].name, mobile: customers[7].phone, email: customers[7].email },
      shippingAddress: flipkartAddr(customers[7]),
    },
  },

  // ── 8. SHIPPED ───────────────────────────────────────────────────────────
  {
    orderId: 'OD882039476608',
    orderItems: [buildItem(10, prod(13), 2, 'SHIPPED', 'FKMP2345678901')],
    orderDate: daysAgo(3),
    dispatchByDate: daysAgo(2),
    promisedDeliveryDate: daysFromNow(1),
    state: 'SHIPPED',
    amount: { totalAmount: prod(13).mrp * 2, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[11].name, mobile: customers[11].phone, email: customers[11].email },
      shippingAddress: flipkartAddr(customers[11]),
    },
  },

  // ── 9. SHIPPED ───────────────────────────────────────────────────────────
  {
    orderId: 'OD993827465709',
    orderItems: [
      buildItem(11, prod(4), 1, 'SHIPPED', 'FKMP3456789012'),
      buildItem(12, prod(14), 1, 'SHIPPED', 'FKMP3456789012'),
    ],
    orderDate: daysAgo(4),
    dispatchByDate: daysAgo(3),
    promisedDeliveryDate: daysFromNow(1),
    state: 'SHIPPED',
    amount: { totalAmount: prod(4).mrp + prod(14).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[21].name, mobile: customers[21].phone, email: customers[21].email },
      shippingAddress: flipkartAddr(customers[21]),
    },
  },

  // ── 10. SHIPPED ──────────────────────────────────────────────────────────
  {
    orderId: 'OD101938274650',
    orderItems: [buildItem(13, prod(20), 3, 'SHIPPED', 'FKMP4567890123')],
    orderDate: daysAgo(4),
    dispatchByDate: daysAgo(3),
    promisedDeliveryDate: daysFromNow(0),
    state: 'SHIPPED',
    amount: { totalAmount: prod(20).mrp * 3, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[2].name, mobile: customers[2].phone, email: customers[2].email },
      shippingAddress: flipkartAddr(customers[2]),
    },
  },

  // ── 11. DELIVERED ────────────────────────────────────────────────────────
  {
    orderId: 'OD112847563011',
    orderItems: [buildItem(14, prod(1), 1, 'DELIVERED', 'FKMP5678901234')],
    orderDate: daysAgo(8),
    dispatchByDate: daysAgo(7),
    promisedDeliveryDate: daysAgo(4),
    state: 'DELIVERED',
    amount: { totalAmount: prod(1).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[1].name, mobile: customers[1].phone, email: customers[1].email },
      shippingAddress: flipkartAddr(customers[1]),
    },
  },

  // ── 12. DELIVERED ────────────────────────────────────────────────────────
  {
    orderId: 'OD223948671012',
    orderItems: [buildItem(15, prod(7), 1, 'DELIVERED', 'FKMP6789012345')],
    orderDate: daysAgo(10),
    dispatchByDate: daysAgo(9),
    promisedDeliveryDate: daysAgo(6),
    state: 'DELIVERED',
    amount: { totalAmount: prod(7).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[8].name, mobile: customers[8].phone, email: customers[8].email },
      shippingAddress: flipkartAddr(customers[8]),
    },
  },

  // ── 13. DELIVERED ────────────────────────────────────────────────────────
  {
    orderId: 'OD334859782013',
    orderItems: [
      buildItem(16, prod(18), 2, 'DELIVERED', 'FKMP7890123456'),
      buildItem(17, prod(19), 1, 'DELIVERED', 'FKMP7890123456'),
    ],
    orderDate: daysAgo(12),
    dispatchByDate: daysAgo(11),
    promisedDeliveryDate: daysAgo(8),
    state: 'DELIVERED',
    amount: { totalAmount: prod(18).mrp * 2 + prod(19).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[13].name, mobile: customers[13].phone, email: customers[13].email },
      shippingAddress: flipkartAddr(customers[13]),
    },
  },

  // ── 14. DELIVERED ────────────────────────────────────────────────────────
  {
    orderId: 'OD445960893114',
    orderItems: [buildItem(18, prod(23), 1, 'DELIVERED', 'FKMP8901234567')],
    orderDate: daysAgo(15),
    dispatchByDate: daysAgo(14),
    promisedDeliveryDate: daysAgo(11),
    state: 'DELIVERED',
    amount: { totalAmount: prod(23).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[4].name, mobile: customers[4].phone, email: customers[4].email },
      shippingAddress: flipkartAddr(customers[4]),
    },
  },

  // ── 15. DELIVERED ────────────────────────────────────────────────────────
  {
    orderId: 'OD556071904215',
    orderItems: [buildItem(19, prod(3), 1, 'DELIVERED', 'FKMP9012345678')],
    orderDate: daysAgo(18),
    dispatchByDate: daysAgo(17),
    promisedDeliveryDate: daysAgo(14),
    state: 'DELIVERED',
    amount: { totalAmount: prod(3).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[6].name, mobile: customers[6].phone, email: customers[6].email },
      shippingAddress: flipkartAddr(customers[6]),
    },
  },

  // ── 16. DELIVERED ────────────────────────────────────────────────────────
  {
    orderId: 'OD667182015316',
    orderItems: [buildItem(20, prod(26), 2, 'DELIVERED', 'FKMP0123456789')],
    orderDate: daysAgo(20),
    dispatchByDate: daysAgo(19),
    promisedDeliveryDate: daysAgo(16),
    state: 'DELIVERED',
    amount: { totalAmount: prod(26).mrp * 2, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[24].name, mobile: customers[24].phone, email: customers[24].email },
      shippingAddress: flipkartAddr(customers[24]),
    },
  },

  // ── 17. CANCELLED_BY_CUSTOMER ─────────────────────────────────────────────
  {
    orderId: 'OD778293126417',
    orderItems: [buildItem(21, prod(5), 1, 'CANCELLED_BY_CUSTOMER')],
    orderDate: daysAgo(5),
    dispatchByDate: daysAgo(4),
    promisedDeliveryDate: daysAgo(1),
    state: 'CANCELLED_BY_CUSTOMER',
    amount: { totalAmount: prod(5).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[10].name, mobile: customers[10].phone, email: customers[10].email },
      shippingAddress: flipkartAddr(customers[10]),
    },
    cancellationReason: 'CUSTOMER_CHANGED_MIND',
  },

  // ── 18. CANCELLED_BY_CUSTOMER ─────────────────────────────────────────────
  {
    orderId: 'OD889304237518',
    orderItems: [buildItem(22, prod(29), 1, 'CANCELLED_BY_CUSTOMER')],
    orderDate: daysAgo(7),
    dispatchByDate: daysAgo(6),
    promisedDeliveryDate: daysAgo(3),
    state: 'CANCELLED_BY_CUSTOMER',
    amount: { totalAmount: prod(29).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[15].name, mobile: customers[15].phone, email: customers[15].email },
      shippingAddress: flipkartAddr(customers[15]),
    },
    cancellationReason: 'ORDER_PLACED_BY_MISTAKE',
  },

  // ── 19. CANCELLATION_APPROVED ────────────────────────────────────────────
  {
    orderId: 'OD990415348619',
    orderItems: [buildItem(23, prod(9), 2, 'CANCELLATION_APPROVED')],
    orderDate: daysAgo(9),
    dispatchByDate: daysAgo(8),
    promisedDeliveryDate: daysAgo(5),
    state: 'CANCELLATION_APPROVED',
    amount: { totalAmount: prod(9).mrp * 2, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[17].name, mobile: customers[17].phone, email: customers[17].email },
      shippingAddress: flipkartAddr(customers[17]),
    },
    cancellationReason: 'SELLER_CANCELLED_ITEM_NOT_AVAILABLE',
  },

  // ── 20. CANCELLATION_APPROVED ────────────────────────────────────────────
  {
    orderId: 'OD101526459720',
    orderItems: [buildItem(24, prod(22), 1, 'CANCELLATION_APPROVED')],
    orderDate: daysAgo(11),
    dispatchByDate: daysAgo(10),
    promisedDeliveryDate: daysAgo(7),
    state: 'CANCELLATION_APPROVED',
    amount: { totalAmount: prod(22).mrp, currency: 'INR' },
    buyerInfo: {
      contact: { name: customers[22].name, mobile: customers[22].phone, email: customers[22].email },
      shippingAddress: flipkartAddr(customers[22]),
    },
    cancellationReason: 'ITEM_FOUND_CHEAPER_ELSEWHERE',
  },
];

module.exports = { flipkartOrders };
