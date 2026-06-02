'use strict';

const { products } = require('../data/products.data');

// ─── SP-API Catalog Items (GET /catalog/2022-04-01/items) ───────────────────
const amazonCatalogItems = products.map((p) => ({
  asin: p.amazonAsin,
  attributes: {
    item_name: [{ value: p.name, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' }],
    brand: [{ value: p.brand, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' }],
    manufacturer: [{ value: p.manufacturer, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' }],
    product_description: [{ value: p.description, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' }],
    bullet_point: [
      { value: p.description, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' },
      { value: `Brand: ${p.brand}`, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' },
      { value: `Category: ${p.category} - ${p.subCategory}`, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' },
      { value: `For: ${p.animalType}`, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' },
      { value: `Weight / Size: ${p.weight}`, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' },
    ],
    part_number: [{ value: p.internalSku, marketplace_id: 'A21TJRUUN4KGV' }],
    external_product_id: [{ value: p.barcode, type: 'EAN', marketplace_id: 'A21TJRUUN4KGV' }],
    list_price: [{ value: p.mrp, currency: 'INR', marketplace_id: 'A21TJRUUN4KGV' }],
    generic_keyword: [
      { value: `${p.brand} ${p.animalType} ${p.subCategory}`, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' },
    ],
    product_type: [{ value: p.category.toUpperCase().replace(/ /g, '_'), marketplace_id: 'A21TJRUUN4KGV' }],
    condition_type: [{ value: 'new_new', marketplace_id: 'A21TJRUUN4KGV' }],
    fulfillment_availability: [{ fulfillment_channel_code: 'DEFAULT', quantity: p.variants[0].stock }],
  },
  identifiers: [
    { marketplaceId: 'A21TJRUUN4KGV', identifiers: [{ identifierType: 'ASIN', identifier: p.amazonAsin }] },
  ],
  images: [
    {
      marketplaceId: 'A21TJRUUN4KGV',
      images: [{ variant: 'MAIN', link: p.imageUrl, height: 400, width: 400 }],
    },
  ],
  productTypes: [{ marketplaceId: 'A21TJRUUN4KGV', productType: p.category.toUpperCase().replace(/ /g, '_') }],
  relationships: [],
  salesRanks: [
    {
      marketplaceId: 'A21TJRUUN4KGV',
      ranks: [
        { title: p.category, link: `https://www.amazon.in/gp/bestsellers/pet-supplies/`, rank: Math.floor(Math.random() * 5000) + 100 },
        { title: p.subCategory, link: `https://www.amazon.in/gp/bestsellers/pet-supplies/`, rank: Math.floor(Math.random() * 1000) + 10 },
      ],
    },
  ],
  summaries: [
    {
      marketplaceId: 'A21TJRUUN4KGV',
      adultProduct: false,
      autographed: false,
      brand: p.brand,
      browseClassification: { displayName: p.category, classificationId: `${1000 + p.id}` },
      color: null,
      contributors: [{ roleType: 'manufacturer', value: p.manufacturer }],
      itemClassification: 'VARIATION_PARENT',
      itemName: p.name,
      manufacturer: p.manufacturer,
      memorabilia: false,
      modelNumber: p.internalSku,
      packageQuantity: 1,
      partNumber: p.internalSku,
      releaseDate: '2022-01-01',
      size: p.weight,
      tradeInEligible: false,
      websiteDisplayGroup: 'pet_supplies_display_on_website',
      websiteDisplayGroupName: 'Pet Supplies',
    },
  ],
  variations: p.variants.map((v, i) => ({
    asin: `${p.amazonAsin}-V${i + 1}`,
    variationAttributes: [{ name: 'size', value: v.value }],
  })),
}));

// ─── SP-API Listings Items (PUT/GET /listings/2021-08-01/items) ──────────────
const amazonListings = products.map((p) => ({
  sku: p.internalSku,
  summaries: [
    {
      marketplaceId: 'A21TJRUUN4KGV',
      asin: p.amazonAsin,
      productType: p.category.toUpperCase().replace(/ /g, '_'),
      conditionType: 'new_new',
      status: ['BUYABLE'],
      itemName: p.name,
      createdDate: '2022-06-01T00:00:00Z',
      lastUpdatedDate: '2026-01-15T00:00:00Z',
      mainImage: { link: p.imageUrl, height: 400, width: 400 },
    },
  ],
  attributes: {
    condition_type: [{ value: 'new_new', marketplace_id: 'A21TJRUUN4KGV' }],
    item_name: [{ value: p.name, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' }],
    brand: [{ value: p.brand, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' }],
    list_price: [{ value: p.mrp, currency: 'INR', marketplace_id: 'A21TJRUUN4KGV' }],
    generic_keyword: [{ value: `${p.brand} ${p.subCategory} ${p.animalType} pet food medicine India`, language_tag: 'en_IN', marketplace_id: 'A21TJRUUN4KGV' }],
    externally_assigned_product_identifier: [{ type: 'ean', value: p.barcode, marketplace_id: 'A21TJRUUN4KGV' }],
  },
  offers: p.variants.map((v, i) => ({
    marketplaceId: 'A21TJRUUN4KGV',
    offerType: 'B2C',
    price: { currency: 'INR', listingPrice: { amount: v.price, currencyCode: 'INR' }, shippingPrice: { amount: 0, currencyCode: 'INR' } },
    points: { pointsNumber: 0 },
    programType: 'REGULAR',
    shippingTime: { min: 1, max: 3, availabilityType: 'NOW' },
    prime: { isOfferPrime: i === 0 && p.mrp >= 499, isOfferNationalPrime: false },
    fulfillmentChannel: 'MERCHANT',
    quantity: v.stock,
    buyingPrice: { listingPrice: { amount: v.price, currencyCode: 'INR' } },
  })),
  fulfillmentAvailability: p.variants.map((v) => ({
    fulfillmentChannelCode: 'DEFAULT',
    quantity: v.stock,
  })),
  procurement: [{ costPrice: { currencyCode: 'INR', amount: p.costPrice } }],
  issues: [],
}));

module.exports = { amazonCatalogItems, amazonListings };
