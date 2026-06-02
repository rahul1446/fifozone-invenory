'use strict';

const { hoursAgo, daysAgo } = require('../data/helpers');
const { customers } = require('../data/customers.data');
const { products } = require('../data/products.data');

// ─── 10 Flipkart Buyer Messages ──────────────────────────────────────────────
const flipkartMessages = [
  {
    messageId: 'MSG-FK-001',
    threadId: 'THD-FK-001',
    orderId: 'OD114823647501',
    orderItemId: 'OI-FK-001',
    buyerName: customers[5].name,
    subject: 'Query about Royal Canin Urinary S/O diet',
    messages: [
      {
        from: 'BUYER',
        body: 'Hello, I ordered the Royal Canin Urinary S/O for my Labrador. Can you confirm the expiry date of the batch you will be shipping? My vet wants to ensure at least 6 months shelf life.',
        timestamp: hoursAgo(3),
      },
    ],
    status: 'OPEN',
    category: 'PRODUCT_QUERY',
    createdAt: hoursAgo(3),
    lastUpdatedAt: hoursAgo(3),
  },
  {
    messageId: 'MSG-FK-002',
    threadId: 'THD-FK-002',
    orderId: 'OD229384756102',
    orderItemId: 'OI-FK-002',
    buyerName: customers[0].name,
    subject: 'When will my order be dispatched?',
    messages: [
      {
        from: 'BUYER',
        body: 'Hi, my Pedigree Adult 3kg order was placed yesterday and it still shows Approved. When will it be packed and dispatched? I need it urgently before the weekend.',
        timestamp: hoursAgo(6),
      },
      {
        from: 'SELLER',
        body: 'Dear Rahul, thank you for your order! Your order is being processed and will be dispatched today before 6 PM. You will receive a tracking number via SMS. Apologies for the wait!',
        timestamp: hoursAgo(4),
      },
    ],
    status: 'REPLIED',
    category: 'SHIPPING_QUERY',
    createdAt: hoursAgo(6),
    lastUpdatedAt: hoursAgo(4),
  },
  {
    messageId: 'MSG-FK-003',
    threadId: 'THD-FK-003',
    orderId: 'OD774938201507',
    orderItemId: 'OI-FK-009',
    buyerName: customers[7].name,
    subject: 'Tracking link not working',
    messages: [
      {
        from: 'BUYER',
        body: 'The Ekart tracking link you provided is not updating since yesterday. It says "In Transit" but no further update. My order was supposed to arrive today.',
        timestamp: daysAgo(1),
      },
      {
        from: 'SELLER',
        body: 'Dear Meera, we apologize for the inconvenience. We have raised a ticket with Ekart Logistics on your behalf. The tracking should update within 24 hours. Estimated delivery remains on time.',
        timestamp: hoursAgo(20),
      },
    ],
    status: 'REPLIED',
    category: 'TRACKING_ISSUE',
    createdAt: daysAgo(1),
    lastUpdatedAt: hoursAgo(20),
  },
  {
    messageId: 'MSG-FK-004',
    threadId: 'THD-FK-004',
    orderId: 'OD112847563011',
    orderItemId: 'OI-FK-014',
    buyerName: customers[1].name,
    subject: 'Return request — damaged packaging',
    messages: [
      {
        from: 'BUYER',
        body: 'The Farmina Hepatic food I received has a torn outer bag. The food is exposed to air which makes it unusable. I want to return this immediately.',
        timestamp: daysAgo(3),
      },
      {
        from: 'SELLER',
        body: 'Dear Priya, we sincerely apologize. A return request has been initiated for you. Our logistics partner will pick up the package within 2–3 business days. Full refund will be processed within 5–7 days.',
        timestamp: daysAgo(2),
      },
      {
        from: 'BUYER',
        body: 'Thank you. Please ensure the pickup happens before Friday as I am travelling after that.',
        timestamp: daysAgo(2),
      },
      {
        from: 'SELLER',
        body: 'Noted, Priya. We have marked your pickup as priority. Ekart will attempt pickup by Thursday.',
        timestamp: daysAgo(1),
      },
    ],
    status: 'REPLIED',
    category: 'RETURN_QUERY',
    createdAt: daysAgo(3),
    lastUpdatedAt: daysAgo(1),
  },
  {
    messageId: 'MSG-FK-005',
    threadId: 'THD-FK-005',
    orderId: 'OD882039476608',
    orderItemId: 'OI-FK-010',
    buyerName: customers[11].name,
    subject: 'Is this product suitable for 8-week old puppy?',
    messages: [
      {
        from: 'BUYER',
        body: 'I ordered the Himalaya Erina flea shampoo for my Golden Retriever puppy who is 8 weeks old. Is it safe to use at this age?',
        timestamp: hoursAgo(12),
      },
      {
        from: 'SELLER',
        body: 'Dear Kavita, thank you for your concern! The Himalaya Erina EP shampoo is recommended for dogs above 12 weeks of age. For puppies younger than 12 weeks, please consult your vet before use. We recommend the gentle puppy shampoo variant instead.',
        timestamp: hoursAgo(9),
      },
    ],
    status: 'REPLIED',
    category: 'PRODUCT_QUERY',
    createdAt: hoursAgo(12),
    lastUpdatedAt: hoursAgo(9),
  },
  {
    messageId: 'MSG-FK-006',
    threadId: 'THD-FK-006',
    orderId: 'OD331948572103',
    orderItemId: 'OI-FK-003',
    buyerName: customers[9].name,
    subject: 'Can I give both Omega 3 and Probiotic together?',
    messages: [
      {
        from: 'BUYER',
        body: 'I ordered the Vivaldis Omega 3 and Vets Kitchen Probiotic together. Can these be given to my dog at the same time or should there be a gap?',
        timestamp: hoursAgo(5),
      },
    ],
    status: 'OPEN',
    category: 'PRODUCT_QUERY',
    createdAt: hoursAgo(5),
    lastUpdatedAt: hoursAgo(5),
  },
  {
    messageId: 'MSG-FK-007',
    threadId: 'THD-FK-007',
    orderId: 'OD993827465709',
    orderItemId: 'OI-FK-011',
    buyerName: customers[21].name,
    subject: 'Invoice copy needed for insurance claim',
    messages: [
      {
        from: 'BUYER',
        body: 'Hello, I need a proper GST invoice for the Farmina N&D food I purchased. My pet insurance company requires it. Can you please share a PDF invoice?',
        timestamp: daysAgo(2),
      },
      {
        from: 'SELLER',
        body: 'Dear Sunita, the GST invoice is available under your Flipkart order details. You can download it from My Orders > Order Details > Download Invoice. If you face any issue, please share your email and we will send it directly.',
        timestamp: daysAgo(2),
      },
      {
        from: 'BUYER',
        body: 'Got it, found the invoice. Thank you!',
        timestamp: daysAgo(1),
      },
    ],
    status: 'CLOSED',
    category: 'INVOICE_REQUEST',
    createdAt: daysAgo(2),
    lastUpdatedAt: daysAgo(1),
  },
  {
    messageId: 'MSG-FK-008',
    threadId: 'THD-FK-008',
    orderId: 'OD558203948305',
    orderItemId: 'OI-FK-006',
    buyerName: customers[16].name,
    subject: 'Wrong flavour delivered',
    messages: [
      {
        from: 'BUYER',
        body: 'I ordered Drools Adult 3kg Chicken & Rice but received Fish & Rice. I have 3 dogs and one of them is allergic to fish. Please arrange replacement immediately.',
        timestamp: hoursAgo(8),
      },
      {
        from: 'SELLER',
        body: 'Dear Manish, we sincerely apologize for this error. We are initiating an immediate replacement. Our team will dispatch the correct product — Drools Adult Chicken & Rice 3kg — within 24 hours and a return pickup for the wrong item will be scheduled simultaneously.',
        timestamp: hoursAgo(6),
      },
    ],
    status: 'REPLIED',
    category: 'WRONG_ITEM',
    createdAt: hoursAgo(8),
    lastUpdatedAt: hoursAgo(6),
  },
  {
    messageId: 'MSG-FK-009',
    threadId: 'THD-FK-009',
    orderId: 'OD556071904215',
    orderItemId: 'OI-FK-019',
    buyerName: customers[6].name,
    subject: 'Refund status — RET-FK-005',
    messages: [
      {
        from: 'BUYER',
        body: 'My return was picked up 7 days ago (RET-FK-005) but the refund has not been credited yet. When can I expect the amount back in my account?',
        timestamp: daysAgo(1),
      },
      {
        from: 'SELLER',
        body: 'Dear Rohan, we confirm the return has been received at our warehouse and quality check is complete. The refund of ₹1,900 has been approved and will reflect in your bank account within 3–5 business days as per Flipkart policy.',
        timestamp: hoursAgo(18),
      },
    ],
    status: 'REPLIED',
    category: 'REFUND_QUERY',
    createdAt: daysAgo(1),
    lastUpdatedAt: hoursAgo(18),
  },
  {
    messageId: 'MSG-FK-010',
    threadId: 'THD-FK-010',
    orderId: 'OD667182015316',
    orderItemId: 'OI-FK-020',
    buyerName: customers[24].name,
    subject: 'Bulk order discount available?',
    messages: [
      {
        from: 'BUYER',
        body: 'I run a small dog shelter in Whitefield and regularly buy supplements. If I order 10+ units of Nutri-Vet Hip & Joint chewables, can I get any bulk discount? We are an NGO.',
        timestamp: daysAgo(4),
      },
      {
        from: 'SELLER',
        body: 'Dear Pavan, thank you for the incredible work you do! Flipkart unfortunately does not support seller-level bulk discounts directly through the platform. However, please email us at fifozone.in@gmail.com with your NGO details and we will see what we can arrange for your shelter.',
        timestamp: daysAgo(3),
      },
      {
        from: 'BUYER',
        body: 'That is very kind of you, I will send you an email. Thank you!',
        timestamp: daysAgo(3),
      },
    ],
    status: 'CLOSED',
    category: 'BULK_ORDER_QUERY',
    createdAt: daysAgo(4),
    lastUpdatedAt: daysAgo(3),
  },
];

module.exports = { flipkartMessages };
