'use strict';

const { daysAgo, hoursAgo } = require('../data/helpers');
const { customers } = require('../data/customers.data');
const { products } = require('../data/products.data');

// Amazon Messaging API — GET /messaging/v1/orders/{amazonOrderId}/messages
// SLA: Amazon requires seller response within 24 hours of message receipt

function slaDeadline(receivedIso) {
  return new Date(new Date(receivedIso).getTime() + 24 * 3600 * 1000).toISOString();
}

const amazonMessages = [
  // ── MESSAGE 01 — Unread, urgent, about pending order (within SLA)
  {
    messageId: 'MSG-AMZ-001',
    amazonOrderId: '402-1000001-8901001',
    participatingParties: [
      { role: 'BUYER', name: customers[0].name, email: customers[0].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'Query about my order — Royal Canin Urinary S/O',
      body: 'Hi, I placed an order for Royal Canin Urinary S/O 2kg about 2 hours back. My dog urgently needs this food as he was just diagnosed with bladder stones. Can you please dispatch today itself? I am in Bangalore so it should reach quickly. Thank you.',
      attachments: [],
    },
    status: 'UNREAD',
    receivedDate: hoursAgo(1),
    slaDeadline: slaDeadline(hoursAgo(1)),
    hoursRemainingForSla: 23,
    isEscalated: false,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 02 — Unread, product query (within SLA)
  {
    messageId: 'MSG-AMZ-002',
    amazonOrderId: '402-1000002-8901002',
    participatingParties: [
      { role: 'BUYER', name: customers[1].name, email: customers[1].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'Farmina Hepatic — feeding instructions?',
      body: 'Hello, I ordered Farmina Hepatic diet for my Labrador who is 4 years old and weighs 32kg. The vet prescribed this but did not give exact quantity to feed per day. Can you please guide me on how much to give? Also does it come with a feeding chart in the box?',
      attachments: [],
    },
    status: 'UNREAD',
    receivedDate: hoursAgo(3),
    slaDeadline: slaDeadline(hoursAgo(3)),
    hoursRemainingForSla: 21,
    isEscalated: false,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 03 — Unread, delivery concern (SLA approaching — 4 hours left)
  {
    messageId: 'MSG-AMZ-003',
    amazonOrderId: '402-1000003-8901003',
    participatingParties: [
      { role: 'BUYER', name: customers[2].name, email: customers[2].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'When will my order ship?',
      body: 'I ordered Royal Canin UltraHypo yesterday and it still shows Unshipped. The Amazon estimated delivery is in 3 days but I need this urgently for my dog who has severe allergies. Please expedite the shipment. If not possible, I may need to cancel.',
      attachments: [],
    },
    status: 'UNREAD',
    receivedDate: hoursAgo(20),
    slaDeadline: slaDeadline(hoursAgo(20)),
    hoursRemainingForSla: 4,
    isEscalated: true,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 04 — Pending (seller replied, waiting for buyer)
  {
    messageId: 'MSG-AMZ-004',
    amazonOrderId: '402-1000004-8901004',
    participatingParties: [
      { role: 'BUYER', name: customers[3].name, email: customers[3].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'Wrong item in multi-product order',
      body: 'Hello. I received the Himalaya shampoo but the Vets Kitchen Probiotic pack seems opened. The foil seal is broken. Please advise what to do.',
      attachments: [{ attachmentId: 'ATTACH-001', fileName: 'broken_seal.jpg', fileSize: 182340, mimeType: 'image/jpeg' }],
    },
    sellerReply: {
      messageType: 'SELLER_TO_BUYER',
      subject: 'RE: Wrong item in multi-product order',
      body: 'Dear Ananya, We sincerely apologize for the inconvenience. We are initiating a replacement for the Vets Kitchen Probiotic immediately. Please do not use the opened pack. Your replacement will be dispatched within 24 hours. Thank you for your patience. — Fifozone Team',
      sentDate: daysAgo(1),
    },
    status: 'PENDING',
    receivedDate: daysAgo(2),
    slaDeadline: slaDeadline(daysAgo(2)),
    hoursRemainingForSla: 0,
    isEscalated: false,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 05 — Replied, resolved
  {
    messageId: 'MSG-AMZ-005',
    amazonOrderId: '402-1000006-8901006',
    participatingParties: [
      { role: 'BUYER', name: customers[5].name, email: customers[5].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'Partially shipped order — Royal Canin Gastrointestinal still pending',
      body: 'Hi, I see the RC Diabetic food has shipped but the RC Gastrointestinal is still pending. My dog needs both. When will the second part ship?',
      attachments: [],
    },
    sellerReply: {
      messageType: 'SELLER_TO_BUYER',
      subject: 'RE: Partially shipped order update',
      body: 'Dear Sneha, The RC Gastrointestinal (2kg) is packed and will be dispatched tomorrow morning via Delhivery. You will receive the tracking number by SMS shortly. Expected delivery by day after tomorrow. — Fifozone',
      sentDate: daysAgo(1),
    },
    status: 'REPLIED',
    receivedDate: daysAgo(2),
    slaDeadline: slaDeadline(daysAgo(2)),
    hoursRemainingForSla: 0,
    isEscalated: false,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 06 — Replied, invoice request
  {
    messageId: 'MSG-AMZ-006',
    amazonOrderId: '402-1000020-8901020',
    participatingParties: [
      { role: 'BUYER', name: 'City Pet Clinic', email: 'procurement@petclinic.in' },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'GST Invoice required for bulk clinic order',
      body: 'Hello Fifozone, We are a registered pet clinic (GSTIN: 29AABCU9603R1ZX). Please send a proper GST invoice along with the shipment for all 4 items in order #402-1000020-8901020. We need it for our clinic accounts. Also confirm dispatch timeline.',
      attachments: [],
    },
    sellerReply: {
      messageType: 'SELLER_TO_BUYER',
      subject: 'RE: GST Invoice — Clinic Bulk Order',
      body: 'Dear City Pet Clinic team, Thank you for your order. GST invoice will be included in the shipment package. Digital copy will also be emailed to procurement@petclinic.in within 2 hours. All 4 items are in stock and will be dispatched by tomorrow 10 AM. — Fifozone',
      sentDate: hoursAgo(8),
    },
    status: 'REPLIED',
    receivedDate: hoursAgo(12),
    slaDeadline: slaDeadline(hoursAgo(12)),
    hoursRemainingForSla: 12,
    isEscalated: false,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 07 — Unread, refund follow-up (SLA breached — escalated)
  {
    messageId: 'MSG-AMZ-007',
    amazonOrderId: '402-1000018-8901018',
    participatingParties: [
      { role: 'BUYER', name: customers[17].name, email: customers[17].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'Cancelled order — refund not received yet',
      body: 'My order was cancelled 4 days back but I have not received my refund yet. I paid via COD but the courier guy came and I gave him the cash thinking it was delivered. Now what? Amazon says seller should handle this. Please resolve urgently.',
      attachments: [],
    },
    status: 'UNREAD',
    receivedDate: daysAgo(2),
    slaDeadline: slaDeadline(daysAgo(2)),
    hoursRemainingForSla: -24,
    isEscalated: true,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 08 — Pending, review request from seller (automated)
  {
    messageId: 'MSG-AMZ-008',
    amazonOrderId: '402-1000010-8901010',
    participatingParties: [
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
      { role: 'BUYER', name: customers[9].name, email: customers[9].email },
    ],
    message: {
      messageType: 'SELLER_TO_BUYER',
      subject: 'How is your Hill\'s Metabolic dog food?',
      body: 'Dear Deepa, Thank you for shopping with Fifozone! We hope your pet is enjoying the Hill\'s Prescription Diet Metabolic food. If you have a moment, we\'d love to hear your feedback. A product review on Amazon helps other pet parents make informed decisions. Thank you! — Fifozone Team',
      attachments: [],
    },
    status: 'PENDING',
    receivedDate: daysAgo(3),
    slaDeadline: null,
    hoursRemainingForSla: null,
    isEscalated: false,
    isAutomatedResponse: true,
  },

  // ── MESSAGE 09 — Replied, shipping address correction
  {
    messageId: 'MSG-AMZ-009',
    amazonOrderId: '402-1000005-8901005',
    participatingParties: [
      { role: 'BUYER', name: customers[4].name, email: customers[4].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'Address change request before dispatch',
      body: 'Hello, I have shifted to a new apartment in Vastrapur. Old address was 56 Vastrapur but now it should be 22 Vastrapur, Flat 401, Mangalam Residency. Order has not shipped yet. Can you please update the address before dispatching? Thank you.',
      attachments: [],
    },
    sellerReply: {
      messageType: 'SELLER_TO_BUYER',
      subject: 'RE: Address change',
      body: 'Dear Vikram, Unfortunately Amazon does not allow us to change shipping addresses once an order is placed. The order must be delivered to the original address or you can cancel and reorder. We recommend placing a new order with the correct address. Apologies for the inconvenience. — Fifozone',
      sentDate: daysAgo(1),
    },
    status: 'REPLIED',
    receivedDate: daysAgo(2),
    slaDeadline: slaDeadline(daysAgo(2)),
    hoursRemainingForSla: 0,
    isEscalated: false,
    isAutomatedResponse: false,
  },

  // ── MESSAGE 10 — Unread, product safety concern (urgent)
  {
    messageId: 'MSG-AMZ-010',
    amazonOrderId: '402-1000009-8901009',
    participatingParties: [
      { role: 'BUYER', name: customers[8].name, email: customers[8].email },
      { role: 'SELLER', name: 'Fifozone Pet Store', email: 'seller@fifozone.in' },
    ],
    message: {
      messageType: 'BUYER_TO_SELLER',
      subject: 'URGENT — Dog vomiting after eating Drools Puppy food',
      body: 'This is extremely urgent. My 3 month old Golden Retriever puppy has been vomiting since I started the Drools Puppy Starter food I received from your store. I took her to the vet and he suspects it could be food contamination or allergy. The batch number on pack is DRL-PUP-2025-03-B14. Please check if there is any issue with this batch. I need a response immediately.',
      attachments: [{ attachmentId: 'ATTACH-010', fileName: 'batch_number.jpg', fileSize: 204800, mimeType: 'image/jpeg' }],
    },
    status: 'UNREAD',
    receivedDate: hoursAgo(6),
    slaDeadline: slaDeadline(hoursAgo(6)),
    hoursRemainingForSla: 18,
    isEscalated: true,
    isAutomatedResponse: false,
  },
];

module.exports = { amazonMessages };
