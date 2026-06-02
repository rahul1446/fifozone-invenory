'use strict';

const { daysAgo } = require('../data/helpers');
const { products } = require('../data/products.data');

// ─── Warehouses ──────────────────────────────────────────────────────────────
const WAREHOUSES = [
  { id: 'WH-MUMBAI-001', city: 'Mumbai',    state: 'Maharashtra' },
  { id: 'WH-DELHI-001',  city: 'New Delhi', state: 'Delhi' },
];

// ─── Build inventory entry for a product ────────────────────────────────────
function buildInventoryEntry(product) {
  const primaryStock   = product.variants[0].stock;
  const damaged        = Math.floor(primaryStock * 0.02);               // ~2% damaged
  const reserved       = Math.floor(primaryStock * 0.07);               // ~7% reserved
  const available      = primaryStock - reserved - damaged;

  // Split between two warehouses (primary gets ~70%)
  const mumbaiTotal    = Math.ceil(primaryStock * 0.7);
  const delhiTotal     = primaryStock - mumbaiTotal;
  const mumbaiReserved = Math.floor(reserved * 0.7);
  const delhiReserved  = reserved - mumbaiReserved;
  const mumbaiDamaged  = Math.floor(damaged * 0.6);
  const delhiDamaged   = damaged - mumbaiDamaged;

  return [
    {
      fsn:         product.flipkartFsin,
      sku:         product.internalSku,
      warehouseId: WAREHOUSES[0].id,
      warehouseCity: WAREHOUSES[0].city,
      quantity: {
        total:     mumbaiTotal,
        available: mumbaiTotal - mumbaiReserved - mumbaiDamaged,
        reserved:  mumbaiReserved,
        damaged:   mumbaiDamaged,
      },
      lastUpdated: daysAgo(Math.floor(Math.random() * 3)),
    },
    {
      fsn:         product.flipkartFsin,
      sku:         product.internalSku,
      warehouseId: WAREHOUSES[1].id,
      warehouseCity: WAREHOUSES[1].city,
      quantity: {
        total:     delhiTotal,
        available: delhiTotal - delhiReserved - delhiDamaged,
        reserved:  delhiReserved,
        damaged:   delhiDamaged,
      },
      lastUpdated: daysAgo(Math.floor(Math.random() * 3)),
    },
  ];
}

const flipkartInventory = {
  listings: products.flatMap(buildInventoryEntry),
  summary: {
    totalListings:     products.length,
    totalWarehouses:   WAREHOUSES.length,
    generatedAt:       daysAgo(0),
  },
};

module.exports = { flipkartInventory };
