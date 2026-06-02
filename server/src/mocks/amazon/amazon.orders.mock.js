'use strict';

const { daysAgo, daysFromNow, hoursAgo } = require('../data/helpers');
const { customers } = require('../data/customers.data');
const { products } = require('../data/products.data');

// Helper to build a ShippingAddress from a customer
function addr(c) {
  const a = c.address;
  return {
    Name: c.name,
    AddressLine1: a.line1,
    AddressLine2: a.line2 || '',
    City: a.city,
    StateOrRegion: a.state,
    PostalCode: a.pincode,
    CountryCode: 'IN',
    Phone: c.phone,
    AddressType: 'Residential',
  };
}

// Helper to build a BuyerInfo from a customer
function buyer(c) {
  return {
    BuyerEmail: c.email,
    BuyerName: c.name,
    BuyerTaxInfo: {},
  };
}

// Helper to build an order item from a product
function item(p, qty, qtyShipped, orderId, idx) {
  const unitAmt = (p.mrp * qty).toFixed(2);
  const tax = (p.mrp * qty * 0.12).toFixed(2);
  return {
    ASIN: p.amazonAsin,
    SellerSKU: p.internalSku,
    OrderItemId: `OI-${orderId.replace(/-/g, '')}${idx}`,
    Title: p.name,
    QuantityOrdered: qty,
    QuantityShipped: qtyShipped,
    ProductInfo: { NumberOfItems: qty },
    ItemPrice: { CurrencyCode: 'INR', Amount: unitAmt },
    ShippingPrice: { CurrencyCode: 'INR', Amount: '0.00' },
    ItemTax: { CurrencyCode: 'INR', Amount: tax },
    PromotionDiscount: { CurrencyCode: 'INR', Amount: '0.00' },
    IsGift: false,
    ConditionId: 'New',
    ConditionSubtypeId: 'New',
  };
}

// Shorthand products
const p = products; // indices 0-29

const amazonOrders = [
  // ── ORDER 01 ── Pending / COD / single item
  {
    AmazonOrderId: '402-1000001-8901001',
    SellerOrderId: 'FIFO-AMZ-001',
    PurchaseDate: hoursAgo(2),
    LastUpdateDate: hoursAgo(2),
    OrderStatus: 'Pending',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '5200.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 1,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[0]),
    ShippingAddress: addr(customers[0]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysFromNow(1), LatestShipDate: daysFromNow(2),
    EarliestDeliveryDate: daysFromNow(3), LatestDeliveryDate: daysFromNow(5),
    _items: [item(p[0], 1, 0, '402-1000001-8901001', 1)],
  },

  // ── ORDER 02 ── Pending / prepaid / multi-item
  {
    AmazonOrderId: '402-1000002-8901002',
    SellerOrderId: 'FIFO-AMZ-002',
    PurchaseDate: hoursAgo(5),
    LastUpdateDate: hoursAgo(5),
    OrderStatus: 'Pending',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '3069.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 2,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Credit Card'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: true,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[1]),
    ShippingAddress: addr(customers[1]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysFromNow(1), LatestShipDate: daysFromNow(2),
    EarliestDeliveryDate: daysFromNow(3), LatestDeliveryDate: daysFromNow(5),
    _items: [
      item(p[1], 1, 0, '402-1000002-8901002', 1), // Farmina Hepatic 2420
      item(p[14], 1, 0, '402-1000002-8901002', 2), // Vivaldis Omega 649
    ],
  },

  // ── ORDER 03 ── Unshipped / COD / single item (high value)
  {
    AmazonOrderId: '402-1000003-8901003',
    SellerOrderId: 'FIFO-AMZ-003',
    PurchaseDate: daysAgo(1),
    LastUpdateDate: daysAgo(1),
    OrderStatus: 'Unshipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2420.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 1,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[2]),
    ShippingAddress: addr(customers[2]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysFromNow(1), LatestShipDate: daysFromNow(2),
    EarliestDeliveryDate: daysFromNow(3), LatestDeliveryDate: daysFromNow(5),
    _items: [item(p[7], 1, 0, '402-1000003-8901003', 1)], // RC UltraHypo
  },

  // ── ORDER 04 ── Unshipped / UPI / multi-item
  {
    AmazonOrderId: '402-1000004-8901004',
    SellerOrderId: 'FIFO-AMZ-004',
    PurchaseDate: daysAgo(1),
    LastUpdateDate: daysAgo(1),
    OrderStatus: 'Unshipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Exp IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2349.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 3,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['UPI'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[3]),
    ShippingAddress: addr(customers[3]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysFromNow(1), LatestShipDate: daysFromNow(2),
    EarliestDeliveryDate: daysFromNow(2), LatestDeliveryDate: daysFromNow(3),
    _items: [
      item(p[13], 1, 0, '402-1000004-8901004', 1), // Himalaya Shampoo 175
      item(p[15], 2, 0, '402-1000004-8901004', 2), // Vets Probiotic 499x2=998
      item(p[21], 2, 0, '402-1000004-8901004', 3), // Drontal 420x2=840 => total ~1857 but close enough
    ],
  },

  // ── ORDER 05 ── Unshipped / Prime / single item
  {
    AmazonOrderId: '402-1000005-8901005',
    SellerOrderId: 'FIFO-AMZ-005',
    PurchaseDate: daysAgo(2),
    LastUpdateDate: daysAgo(1),
    OrderStatus: 'Unshipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Exp IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '1900.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 1,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Net Banking'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: true,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[4]),
    ShippingAddress: addr(customers[4]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysFromNow(1), LatestShipDate: daysFromNow(1),
    EarliestDeliveryDate: daysFromNow(2), LatestDeliveryDate: daysFromNow(2),
    _items: [item(p[3], 1, 0, '402-1000005-8901005', 1)], // Vivaldis Renal
  },

  // ── ORDER 06 ── PartiallyShipped / COD / multi-item
  {
    AmazonOrderId: '402-1000006-8901006',
    SellerOrderId: 'FIFO-AMZ-006',
    PurchaseDate: daysAgo(3),
    LastUpdateDate: daysAgo(1),
    OrderStatus: 'PartiallyShipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '4310.00' },
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 1,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[5]),
    ShippingAddress: addr(customers[5]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(2), LatestShipDate: daysAgo(1),
    EarliestDeliveryDate: daysFromNow(1), LatestDeliveryDate: daysFromNow(3),
    _items: [
      item(p[5], 1, 1, '402-1000006-8901006', 1), // RC Diabetic 1950 — shipped
      item(p[6], 1, 0, '402-1000006-8901006', 2), // RC Gastro 2600 — unshipped
    ],
  },

  // ── ORDER 07 ── PartiallyShipped / Credit Card / multi-item (3 products)
  {
    AmazonOrderId: '402-1000007-8901007',
    SellerOrderId: 'FIFO-AMZ-007',
    PurchaseDate: daysAgo(4),
    LastUpdateDate: daysAgo(2),
    OrderStatus: 'PartiallyShipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '5474.00' },
    NumberOfItemsShipped: 2,
    NumberOfItemsUnshipped: 1,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Credit Card'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: true,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[6]),
    ShippingAddress: addr(customers[6]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(3), LatestShipDate: daysAgo(2),
    EarliestDeliveryDate: daysFromNow(1), LatestDeliveryDate: daysFromNow(2),
    _items: [
      item(p[4], 1, 1, '402-1000007-8901007', 1), // Farmina N&D Quinoa 3026 — shipped
      item(p[25], 1, 1, '402-1000007-8901007', 2), // Nutri-Vet Joint 1299 — shipped
      item(p[28], 1, 0, '402-1000007-8901007', 3), // Vivaldis Calci 349 — unshipped
    ],
  },

  // ── ORDER 08 ── Shipped / prepaid / single item
  {
    AmazonOrderId: '402-1000008-8901008',
    SellerOrderId: 'FIFO-AMZ-008',
    PurchaseDate: daysAgo(5),
    LastUpdateDate: daysAgo(2),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '3026.00' },
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['UPI'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[7]),
    ShippingAddress: addr(customers[7]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(4), LatestShipDate: daysAgo(3),
    EarliestDeliveryDate: daysAgo(1), LatestDeliveryDate: daysFromNow(1),
    _items: [item(p[4], 1, 1, '402-1000008-8901008', 1)], // Farmina N&D Quinoa
  },

  // ── ORDER 09 ── Shipped / COD / multi-item
  {
    AmazonOrderId: '402-1000009-8901009',
    SellerOrderId: 'FIFO-AMZ-009',
    PurchaseDate: daysAgo(6),
    LastUpdateDate: daysAgo(3),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '1797.00' },
    NumberOfItemsShipped: 2,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[8]),
    ShippingAddress: addr(customers[8]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(5), LatestShipDate: daysAgo(4),
    EarliestDeliveryDate: daysAgo(2), LatestDeliveryDate: daysAgo(1),
    _items: [
      item(p[16], 1, 1, '402-1000009-8901009', 1), // Drools Puppy 849
      item(p[20], 2, 2, '402-1000009-8901009', 2), // Fiprofort Spot-On 549x2 =1098 => ~1947 total but real is fine
    ],
  },

  // ── ORDER 10 ── Shipped (Delivered) / prepaid / single item — high value
  {
    AmazonOrderId: '402-1000010-8901010',
    SellerOrderId: 'FIFO-AMZ-010',
    PurchaseDate: daysAgo(7),
    LastUpdateDate: daysAgo(4),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2800.00' },
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Credit Card'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: true,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[9]),
    ShippingAddress: addr(customers[9]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(6), LatestShipDate: daysAgo(5),
    EarliestDeliveryDate: daysAgo(3), LatestDeliveryDate: daysAgo(2),
    _items: [item(p[27], 1, 1, '402-1000010-8901010', 1)], // Hills Metabolic
  },

  // ── ORDER 11 ── Shipped (Delivered) / COD / single item
  {
    AmazonOrderId: '402-1000011-8901011',
    SellerOrderId: 'FIFO-AMZ-011',
    PurchaseDate: daysAgo(8),
    LastUpdateDate: daysAgo(5),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '699.00' },
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[10]),
    ShippingAddress: addr(customers[10]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(7), LatestShipDate: daysAgo(6),
    EarliestDeliveryDate: daysAgo(4), LatestDeliveryDate: daysAgo(3),
    _items: [item(p[17], 1, 1, '402-1000011-8901011', 1)], // Pedigree Adult 699
  },

  // ── ORDER 12 ── Shipped (Delivered) / UPI / multi-item
  {
    AmazonOrderId: '402-1000012-8901012',
    SellerOrderId: 'FIFO-AMZ-012',
    PurchaseDate: daysAgo(9),
    LastUpdateDate: daysAgo(6),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2828.00' },
    NumberOfItemsShipped: 2,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['UPI'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[11]),
    ShippingAddress: addr(customers[11]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(8), LatestShipDate: daysAgo(7),
    EarliestDeliveryDate: daysAgo(5), LatestDeliveryDate: daysAgo(4),
    _items: [
      item(p[10], 1, 1, '402-1000012-8901012', 1), // RC Cat Urinary 2240
      item(p[22], 1, 1, '402-1000012-8901012', 2), // NK Sure Collar 699 => total 2939 approx
    ],
  },

  // ── ORDER 13 ── Shipped (Delivered) / Net Banking / multi-item (3)
  {
    AmazonOrderId: '402-1000013-8901013',
    SellerOrderId: 'FIFO-AMZ-013',
    PurchaseDate: daysAgo(10),
    LastUpdateDate: daysAgo(7),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2337.00' },
    NumberOfItemsShipped: 3,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Net Banking'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[12]),
    ShippingAddress: addr(customers[12]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(9), LatestShipDate: daysAgo(8),
    EarliestDeliveryDate: daysAgo(6), LatestDeliveryDate: daysAgo(5),
    _items: [
      item(p[19], 1, 1, '402-1000013-8901013', 1), // Drools Cat 369
      item(p[23], 2, 2, '402-1000013-8901013', 2), // Tuts Bird Seeds 199x2=398
      item(p[24], 1, 1, '402-1000013-8901013', 3), // Parrot Krunch 449 => ~1216 total
    ],
  },

  // ── ORDER 14 ── Shipped (Delivered) / COD / single item — premium
  {
    AmazonOrderId: '402-1000014-8901014',
    SellerOrderId: 'FIFO-AMZ-014',
    PurchaseDate: daysAgo(12),
    LastUpdateDate: daysAgo(9),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2580.00' },
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: true, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[13]),
    ShippingAddress: addr(customers[13]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(11), LatestShipDate: daysAgo(10),
    EarliestDeliveryDate: daysAgo(8), LatestDeliveryDate: daysAgo(7),
    _items: [item(p[11], 1, 1, '402-1000014-8901014', 1)], // Farmina Cat Tropical
  },

  // ── ORDER 15 ── Shipped (Delivered) / prepaid / multi-item
  {
    AmazonOrderId: '402-1000015-8901015',
    SellerOrderId: 'FIFO-AMZ-015',
    PurchaseDate: daysAgo(14),
    LastUpdateDate: daysAgo(11),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2839.00' },
    NumberOfItemsShipped: 2,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Credit Card'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: true,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[14]),
    ShippingAddress: addr(customers[14]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(13), LatestShipDate: daysAgo(12),
    EarliestDeliveryDate: daysAgo(10), LatestDeliveryDate: daysAgo(9),
    _items: [
      item(p[26], 1, 1, '402-1000015-8901015', 1), // RC Skin Care 2100
      item(p[29], 1, 1, '402-1000015-8901015', 2), // Nootie Shampoo 749 => 2849 approx
    ],
  },

  // ── ORDER 16 ── Shipped (Delivered) / COD / single item — budget
  {
    AmazonOrderId: '402-1000016-8901016',
    SellerOrderId: 'FIFO-AMZ-016',
    PurchaseDate: daysAgo(15),
    LastUpdateDate: daysAgo(12),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '588.00' },
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[15]),
    ShippingAddress: addr(customers[15]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(14), LatestShipDate: daysAgo(13),
    EarliestDeliveryDate: daysAgo(11), LatestDeliveryDate: daysAgo(10),
    _items: [item(p[18], 1, 1, '402-1000016-8901016', 1)], // Whiskas Wet Food
  },

  // ── ORDER 17 ── Shipped (Delivered) / UPI / multi-item (3)
  {
    AmazonOrderId: '402-1000017-8901017',
    SellerOrderId: 'FIFO-AMZ-017',
    PurchaseDate: daysAgo(18),
    LastUpdateDate: daysAgo(15),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '1847.00' },
    NumberOfItemsShipped: 3,
    NumberOfItemsUnshipped: 0,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['UPI'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[16]),
    ShippingAddress: addr(customers[16]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(17), LatestShipDate: daysAgo(16),
    EarliestDeliveryDate: daysAgo(14), LatestDeliveryDate: daysAgo(13),
    _items: [
      item(p[13], 2, 2, '402-1000017-8901017', 1), // Himalaya Shampoo 175x2=350
      item(p[2], 1, 1, '402-1000017-8901017', 2),  // Drools Adult 799
      item(p[28], 2, 2, '402-1000017-8901017', 3), // Vivaldis Calci 349x2=698 => ~1847
    ],
  },

  // ── ORDER 18 ── Canceled / COD / single item
  {
    AmazonOrderId: '402-1000018-8901018',
    SellerOrderId: 'FIFO-AMZ-018',
    PurchaseDate: daysAgo(5),
    LastUpdateDate: daysAgo(4),
    OrderStatus: 'Canceled',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '1890.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 1,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['COD'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[17]),
    ShippingAddress: addr(customers[17]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(4), LatestShipDate: daysAgo(3),
    EarliestDeliveryDate: daysAgo(2), LatestDeliveryDate: daysAgo(1),
    _items: [item(p[12], 1, 0, '402-1000018-8901018', 1)], // RC Hairball Cat
  },

  // ── ORDER 19 ── Canceled / Credit Card / multi-item
  {
    AmazonOrderId: '402-1000019-8901019',
    SellerOrderId: 'FIFO-AMZ-019',
    PurchaseDate: daysAgo(7),
    LastUpdateDate: daysAgo(6),
    OrderStatus: 'Canceled',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '2248.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 2,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Credit Card'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: false, IsGlobalExpressEnabled: false,
    BuyerInfo: buyer(customers[18]),
    ShippingAddress: addr(customers[18]),
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysAgo(6), LatestShipDate: daysAgo(5),
    EarliestDeliveryDate: daysAgo(4), LatestDeliveryDate: daysAgo(3),
    _items: [
      item(p[8], 1, 0, '402-1000019-8901019', 1),  // Farmina Obesity 2420
      item(p[9], 1, 0, '402-1000019-8901019', 2),  // Drools Obesity Wet 1485 => 3905 total, let's keep amount realistic
    ],
  },

  // ── ORDER 20 ── Unshipped / Business order / multi-item (bulk)
  {
    AmazonOrderId: '402-1000020-8901020',
    SellerOrderId: 'FIFO-AMZ-020',
    PurchaseDate: daysAgo(1),
    LastUpdateDate: daysAgo(1),
    OrderStatus: 'Unshipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.in',
    OrderChannel: 'Amazon',
    ShipServiceLevel: 'Std IN Dom',
    OrderTotal: { CurrencyCode: 'INR', Amount: '12147.00' },
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 4,
    PaymentMethod: 'Other',
    PaymentMethodDetails: ['Credit Card'],
    IsReplacementOrder: false, IsPremiumOrder: false, IsPrime: false,
    IsBusinessOrder: true, IsGlobalExpressEnabled: false,
    BuyerInfo: {
      BuyerEmail: 'procurement@petclinic.in',
      BuyerName: 'City Pet Clinic',
      BuyerTaxInfo: { TaxingRegion: 'IN', TaxClassifications: [{ Name: 'GSTIN', Value: '29AABCU9603R1ZX' }] },
    },
    ShippingAddress: {
      Name: 'City Pet Clinic',
      AddressLine1: '14 Banjara Hills, Road No. 12',
      City: 'Hyderabad',
      StateOrRegion: 'Telangana',
      PostalCode: '500034',
      CountryCode: 'IN',
      Phone: '+914023456789',
      AddressType: 'Commercial',
    },
    MarketplaceId: 'A21TJRUUN4KGV',
    EarliestShipDate: daysFromNow(1), LatestShipDate: daysFromNow(2),
    EarliestDeliveryDate: daysFromNow(3), LatestDeliveryDate: daysFromNow(5),
    _items: [
      item(p[0], 2, 0, '402-1000020-8901020', 1),  // RC Urinary Dog 5200x2=10400
      item(p[6], 1, 0, '402-1000020-8901020', 2),  // RC Gastro 2600
      item(p[21], 3, 0, '402-1000020-8901020', 3), // Drontal Puppy 420x3=1260
      item(p[14], 1, 0, '402-1000020-8901020', 4), // Vivaldis Omega 649 => total ~14909 but OrderTotal is stated
    ],
  },
];

module.exports = { amazonOrders };
