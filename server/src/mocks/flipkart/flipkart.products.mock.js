'use strict';

const { daysAgo } = require('../data/helpers');
const { products } = require('../data/products.data');

// ─── Build Flipkart listing from shared product catalogue ───────────────────
function buildListing(product, index) {
  const listingNum = String(index + 1).padStart(6, '0');
  // Selling price is MRP for simplicity (could be MRP - discount in prod)
  const sellingPrice = product.mrp;
  const mrp = Math.round(product.mrp * 1.02); // MRP slightly higher than selling price

  // Determine stock from first variant
  const stockCount = product.variants[0].stock;

  // Weight parsing
  const weightMatch = product.weight.match(/^([\d.]+)\s*(kg|g|ml|l)/i);
  const weightValue = weightMatch ? parseFloat(weightMatch[1]) : 1;
  const weightUnit  = weightMatch ? weightMatch[2].toLowerCase() : 'kg';

  // Derive category name
  const categoryMap = {
    'Dog Medicine': 'Veterinary Dog Food & Supplements',
    'Dog Food':     'Dog Dry Food',
    'Cat Medicine': 'Veterinary Cat Food & Supplements',
    'Cat Food':     'Cat Food',
    'Pet Grooming': 'Dog Grooming Products',
    'Vitamins & Supplements': 'Pet Vitamins & Supplements',
    'Bird Food':    'Bird Food & Treats',
  };
  const flipkartCategory = categoryMap[product.category] || product.category;

  return {
    listingId: `LST-FK-${listingNum}`,
    fsn: product.flipkartFsin,
    sku: product.internalSku,
    productTitle: product.name,
    brandName: product.brand,
    categoryName: flipkartCategory,
    state: 'ACTIVE',
    flipkartSellingPrice: {
      amount: sellingPrice,
      currency: 'INR',
      mrp: mrp,
    },
    stockCount: stockCount,
    imageUrls: [product.imageUrl],
    packageDetails: {
      weight: { value: weightValue, unit: weightUnit },
    },
    listingStatus: 'ACTIVE',
    lastUpdated: daysAgo(Math.floor(Math.random() * 7)),
  };
}

const flipkartListings = products.map((product, index) => buildListing(product, index));

module.exports = { flipkartListings };
