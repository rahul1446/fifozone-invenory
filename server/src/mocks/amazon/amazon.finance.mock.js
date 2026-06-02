const { daysAgo } = require('../data/helpers');

const amazonFinancialEvents = {
  shipmentEventList: [
    { amazonOrderId: '402-1234567-8901234', sellerOrderId: 'FIFO-AMZ-001', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'RC-URN-001', orderItemId: 'OI-1234567890', quantityShipped: 1,
        itemChargeList: [
          { chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 5200.00 } },
          { chargeType: 'Tax', chargeAmount: { currencyCode: 'INR', currencyAmount: 560.87 } }
        ],
        itemFeeList: [
          { feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -624.00 } },
          { feeType: 'FixedClosingFee', feeAmount: { currencyCode: 'INR', currencyAmount: -2.00 } }
        ] }], postedDate: daysAgo(0) },
    { amazonOrderId: '402-2345678-9012345', sellerOrderId: 'FIFO-AMZ-002', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'FAR-HEP-001', orderItemId: 'OI-2345678901', quantityShipped: 2,
        itemChargeList: [
          { chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 4840.00 } },
          { chargeType: 'Tax', chargeAmount: { currencyCode: 'INR', currencyAmount: 522.62 } }
        ],
        itemFeeList: [
          { feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -580.80 } }
        ] }], postedDate: daysAgo(1) },
    { amazonOrderId: '402-3456789-0123456', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'DRL-ADT-001', quantityShipped: 1,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 799.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -95.88 } }]
      }], postedDate: daysAgo(2) },
    { amazonOrderId: '402-5678901-2345678', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'FAR-QUA-001', quantityShipped: 3,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 9078.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -1089.36 } }]
      }], postedDate: daysAgo(1) },
    { amazonOrderId: '402-6789012-3456789', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'VIV-OMEG-001', quantityShipped: 2,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 1298.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -155.76 } }]
      }], postedDate: daysAgo(3) },
    { amazonOrderId: '402-7890123-4567890', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'HIM-ERINA-001', quantityShipped: 5,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 875.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -105.00 } }]
      }], postedDate: daysAgo(4) },
    { amazonOrderId: '402-8901234-5678901', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'PED-ADT-001', quantityShipped: 2,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 1398.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -167.76 } }]
      }], postedDate: daysAgo(5) },
    { amazonOrderId: '402-9012345-6789012', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'RC-DIAB-001', quantityShipped: 1,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 1950.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -234.00 } }]
      }], postedDate: daysAgo(6) },
    { amazonOrderId: '402-0123456-7890123', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'NUTRP-001', quantityShipped: 1,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 1299.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -155.88 } }]
      }], postedDate: daysAgo(7) },
    { amazonOrderId: '402-1234567-9012345', marketplaceName: 'Amazon.in',
      shipmentItemList: [{ sellerSku: 'DRO-PUP-001', quantityShipped: 3,
        itemChargeList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: 1260.00 } }],
        itemFeeList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: -151.20 } }]
      }], postedDate: daysAgo(8) },
  ],
  refundEventList: [
    { amazonOrderId: '402-4567890-1234567', marketplaceName: 'Amazon.in',
      shipmentItemAdjustmentList: [{ sellerSku: 'VIV-REN-001', quantityShipped: 1,
        itemChargeAdjustmentList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: -1900.00 } }],
        itemFeeAdjustmentList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: 228.00 } }]
      }], postedDate: daysAgo(2) },
    { amazonOrderId: '402-2345678-0123456', marketplaceName: 'Amazon.in',
      shipmentItemAdjustmentList: [{ sellerSku: 'DRL-ADT-001', quantityShipped: 1,
        itemChargeAdjustmentList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: -799.00 } }],
        itemFeeAdjustmentList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: 95.88 } }]
      }], postedDate: daysAgo(5) },
    { amazonOrderId: '402-3456789-1234567', marketplaceName: 'Amazon.in',
      shipmentItemAdjustmentList: [{ sellerSku: 'RC-HYPO-001', quantityShipped: 1,
        itemChargeAdjustmentList: [{ chargeType: 'Principal', chargeAmount: { currencyCode: 'INR', currencyAmount: -2420.00 } }],
        itemFeeAdjustmentList: [{ feeType: 'ReferralFee', feeAmount: { currencyCode: 'INR', currencyAmount: 290.40 } }]
      }], postedDate: daysAgo(9) },
  ],
  serviceFeesEventList: [
    { feeReason: 'MonthlySubscriptionFee',
      feeList: [{ feeType: 'Subscription', feeAmount: { currencyCode: 'INR', currencyAmount: -999.00 } }],
      postedDate: daysAgo(5) },
    { feeReason: 'StorageFee',
      feeList: [{ feeType: 'Storage', feeAmount: { currencyCode: 'INR', currencyAmount: -245.00 } }],
      postedDate: daysAgo(3) },
  ],
};

module.exports = { amazonFinancialEvents };
