'use strict';

const { products } = require('../data/products.data');

// ─── FBA Inventory API v1 — GET /fba/inventory/v1/summaries ─────────────────
const amazonInventory = {
  granularity: {
    granularityType: 'Marketplace',
    granularityId: 'A21TJRUUN4KGV',
  },
  inventorySummaries: products.map((p) => {
    const primaryVariant = p.variants[0];
    const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
    const reserved = Math.floor(totalStock * 0.05);        // ~5% reserved
    const inbound = Math.floor(totalStock * 0.08);         // ~8% inbound
    const unfulfillable = Math.max(0, Math.floor(totalStock * 0.01)); // ~1% unfulfillable
    const researching = 0;
    const fulfillable = Math.max(0, totalStock - reserved - unfulfillable);

    return {
      asin: p.amazonAsin,
      fnSku: `X00${p.id.toString().padStart(7, '0')}`,
      sellerSku: p.internalSku,
      condition: 'NewItem',
      lastUpdatedTime: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      productName: p.name,
      totalQuantity: totalStock,
      stores: [
        {
          storeName: 'Amazon.in',
          storeId: 'A21TJRUUN4KGV',
          inventoryDetails: {
            fulfillableQuantity: fulfillable,
            inboundWorkingQuantity: inbound,
            inboundShippedQuantity: 0,
            inboundReceivingQuantity: 0,
            reservedQuantity: {
              totalReservedQuantity: reserved,
              pendingCustomerOrderQuantity: Math.floor(reserved * 0.7),
              pendingTransshipmentQuantity: Math.floor(reserved * 0.2),
              fcProcessingQuantity: Math.floor(reserved * 0.1),
            },
            researchingQuantity: {
              totalResearchingQuantity: researching,
              researchingQuantityBreakdown: [],
            },
            unfulfillableQuantity: {
              totalUnfulfillableQuantity: unfulfillable,
              customerDamagedQuantity: Math.floor(unfulfillable * 0.5),
              warehouseDamagedQuantity: Math.floor(unfulfillable * 0.3),
              distributorDamagedQuantity: 0,
              carrierDamagedQuantity: Math.floor(unfulfillable * 0.2),
              defectiveQuantity: 0,
              expiredQuantity: 0,
            },
          },
        },
      ],
    };
  }),
};

module.exports = { amazonInventory };
