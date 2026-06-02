// ─── Shared product catalogue (30 realistic pet medicine/food products) ────────
const products = [
  {
    id: 1, internalSku: 'RC-URN-001', barcode: '3182550911016',
    name: 'Royal Canin Veterinary Diet Urinary S/O Dog Dry Food',
    brand: 'Royal Canin', manufacturer: 'Royal Canin SAS',
    category: 'Dog Medicine', subCategory: 'Urinary Care', animalType: 'dog',
    weight: '2kg', mrp: 5200, costPrice: 3800,
    description: 'Specially formulated veterinary diet for dogs with lower urinary tract conditions.',
    imageUrl: 'https://placehold.co/400x400/1A7F5A/FFFFFF?text=Royal+Canin+Urinary',
    amazonAsin: 'B07RCURN001', flipkartFsin: 'FSIN-RC-URN-001',
    variants: [{ value: '2kg', price: 5200, stock: 30 }, { value: '3kg', price: 7200, stock: 15 }, { value: '6kg', price: 12800, stock: 8 }]
  },
  {
    id: 2, internalSku: 'FAR-HEP-001', barcode: '8010276027702',
    name: 'Farmina Vet Life Hepatic Canine Formula Adult Dog Dry Food',
    brand: 'Farmina', manufacturer: 'Farmina Pet Foods',
    category: 'Dog Medicine', subCategory: 'Hepatic Care', animalType: 'dog',
    weight: '2kg', mrp: 2420, costPrice: 1700,
    description: 'Complete dietetic feed for dogs with chronic hepatic insufficiency.',
    imageUrl: 'https://placehold.co/400x400/1565C0/FFFFFF?text=Farmina+Hepatic',
    amazonAsin: 'B07FARHEP01', flipkartFsin: 'FSIN-FAR-HEP-001',
    variants: [{ value: '2kg', price: 2420, stock: 25 }, { value: '12kg', price: 13100, stock: 6 }]
  },
  {
    id: 3, internalSku: 'DRL-ADT-001', barcode: '8906072700123',
    name: 'Drools VET PRO Adult Dog Dry Food',
    brand: 'Drools', manufacturer: 'Drools Pet Food Pvt Ltd',
    category: 'Dog Food', subCategory: 'Adult', animalType: 'dog',
    weight: '3kg', mrp: 799, costPrice: 550,
    description: 'Complete and balanced nutrition for adult dogs with real chicken.',
    imageUrl: 'https://placehold.co/400x400/E65100/FFFFFF?text=Drools+Adult',
    amazonAsin: 'B07DRLADT01', flipkartFsin: 'FSIN-DRL-ADT-001',
    variants: [{ value: '3kg', price: 799, stock: 80 }, { value: '6kg', price: 1598, stock: 40 }, { value: '12kg', price: 2899, stock: 15 }]
  },
  {
    id: 4, internalSku: 'VIV-REN-001', barcode: '8906012300456',
    name: 'Vivaldis V Diet Renal Diet Dog Dry Food',
    brand: 'Vivaldis', manufacturer: 'Vivaldis Animal Health',
    category: 'Dog Medicine', subCategory: 'Renal Care', animalType: 'dog',
    weight: '2kg', mrp: 1900, costPrice: 1300,
    description: 'Low phosphorus formula to support dogs with renal insufficiency.',
    imageUrl: 'https://placehold.co/400x400/6A1B9A/FFFFFF?text=Vivaldis+Renal',
    amazonAsin: 'B07VIVREN01', flipkartFsin: 'FSIN-VIV-REN-001',
    variants: [{ value: '2kg', price: 1900, stock: 18 }]
  },
  {
    id: 5, internalSku: 'FAR-QUA-001', barcode: '8010276051531',
    name: 'Farmina N&D Quinoa Quail Skin & Coat All Breed Dog Dry Food',
    brand: 'Farmina', manufacturer: 'Farmina Pet Foods',
    category: 'Dog Food', subCategory: 'Skin & Coat', animalType: 'dog',
    weight: '2.5kg', mrp: 3026, costPrice: 2100,
    description: 'Grain-free formula with fresh quail and quinoa for skin and coat health.',
    imageUrl: 'https://placehold.co/400x400/F57F17/FFFFFF?text=Farmina+N%26D',
    amazonAsin: 'B07FARQUA01', flipkartFsin: 'FSIN-FAR-QUA-001',
    variants: [{ value: '2.5kg', price: 3026, stock: 22 }, { value: '7kg', price: 7517, stock: 12 }, { value: '14kg', price: 13500, stock: 5 }]
  },
  {
    id: 6, internalSku: 'RC-DIAB-001', barcode: '3182550785167',
    name: 'Royal Canin Veterinary Diet Diabetic Dog Dry Food',
    brand: 'Royal Canin', manufacturer: 'Royal Canin SAS',
    category: 'Dog Medicine', subCategory: 'Diabetic Care', animalType: 'dog',
    weight: '1.5kg', mrp: 1950, costPrice: 1400,
    description: 'Nutritional support for diabetic dogs with controlled carbohydrates.',
    imageUrl: 'https://placehold.co/400x400/1A7F5A/FFFFFF?text=RC+Diabetic',
    amazonAsin: 'B07RCDIAB01', flipkartFsin: 'FSIN-RC-DIAB-001',
    variants: [{ value: '1.5kg', price: 1950, stock: 14 }, { value: '3kg', price: 3900, stock: 7 }]
  },
  {
    id: 7, internalSku: 'RC-GASTR-001', barcode: '3182550771291',
    name: 'Royal Canin Veterinary Diet Gastrointestinal Dog Dry Food',
    brand: 'Royal Canin', manufacturer: 'Royal Canin SAS',
    category: 'Dog Medicine', subCategory: 'Gastrointestinal', animalType: 'dog',
    weight: '2kg', mrp: 2600, costPrice: 1900,
    description: 'Highly digestible nutrition for dogs with gastrointestinal disorders.',
    imageUrl: 'https://placehold.co/400x400/1A7F5A/FFFFFF?text=RC+Gastro',
    amazonAsin: 'B07RCGAS01', flipkartFsin: 'FSIN-RC-GASTR-001',
    variants: [{ value: '2kg', price: 2600, stock: 22 }, { value: '7kg', price: 7800, stock: 5 }]
  },
  {
    id: 8, internalSku: 'RC-HYPO-001', barcode: '3182550920049',
    name: 'Royal Canin Veterinary UltraHypo Canine Dog Dry Food',
    brand: 'Royal Canin', manufacturer: 'Royal Canin SAS',
    category: 'Dog Medicine', subCategory: 'Hypoallergenic', animalType: 'dog',
    weight: '2kg', mrp: 2420, costPrice: 1750,
    description: 'Ultra-hydrolyzed protein for dogs with severe food allergies.',
    imageUrl: 'https://placehold.co/400x400/1A7F5A/FFFFFF?text=RC+UltraHypo',
    amazonAsin: 'B07RCHYPO01', flipkartFsin: 'FSIN-RC-HYPO-001',
    variants: [{ value: '2kg', price: 2420, stock: 20 }, { value: '12kg', price: 12600, stock: 4 }]
  },
  {
    id: 9, internalSku: 'FAR-OBE-001', barcode: '8010276032706',
    name: 'Farmina Vet Life Obesity Canine Formula Adult Dog Dry Food',
    brand: 'Farmina', manufacturer: 'Farmina Pet Foods',
    category: 'Dog Medicine', subCategory: 'Obesity Management', animalType: 'dog',
    weight: '2kg', mrp: 2420, costPrice: 1700,
    description: 'Low fat diet for dogs requiring weight reduction.',
    imageUrl: 'https://placehold.co/400x400/1565C0/FFFFFF?text=Farmina+Obesity',
    amazonAsin: 'B07FAROBE01', flipkartFsin: 'FSIN-FAR-OBE-001',
    variants: [{ value: '2kg', price: 2420, stock: 16 }, { value: '12kg', price: 13100, stock: 3 }]
  },
  {
    id: 10, internalSku: 'DRL-OBE-001', barcode: '8906072701234',
    name: 'Drools VET PRO Obesity Wet Food for Dogs',
    brand: 'Drools', manufacturer: 'Drools Pet Food Pvt Ltd',
    category: 'Dog Medicine', subCategory: 'Weight Management', animalType: 'dog',
    weight: '150g x 15', mrp: 1485, costPrice: 950,
    description: 'Low calorie wet food for overweight dogs.',
    imageUrl: 'https://placehold.co/400x400/E65100/FFFFFF?text=Drools+Obesity',
    amazonAsin: 'B07DRLOBE01', flipkartFsin: 'FSIN-DRL-OBE-001',
    variants: [{ value: '15x150g', price: 1485, stock: 35 }, { value: '30x150g', price: 2970, stock: 18 }]
  },
  // Cat food & medicine
  {
    id: 11, internalSku: 'RC-CAT-URN-001', barcode: '3182550710411',
    name: 'Royal Canin Veterinary Diet Urinary S/O Cat Dry Food',
    brand: 'Royal Canin', manufacturer: 'Royal Canin SAS',
    category: 'Cat Medicine', subCategory: 'Urinary Care', animalType: 'cat',
    weight: '1.5kg', mrp: 2240, costPrice: 1600,
    description: 'Veterinary diet for cats with lower urinary tract conditions.',
    imageUrl: 'https://placehold.co/400x400/C62828/FFFFFF?text=RC+Cat+Urinary',
    amazonAsin: 'B07RCCATURI01', flipkartFsin: 'FSIN-RC-CAT-URN-001',
    variants: [{ value: '1.5kg', price: 2240, stock: 25 }, { value: '3.5kg', price: 4800, stock: 10 }]
  },
  {
    id: 12, internalSku: 'FAR-CAT-STR-001', barcode: '8010276052323',
    name: 'Farmina N&D Tropical Selection Cat Dry Food',
    brand: 'Farmina', manufacturer: 'Farmina Pet Foods',
    category: 'Cat Food', subCategory: 'Grain Free', animalType: 'cat',
    weight: '1.5kg', mrp: 2580, costPrice: 1800,
    description: 'Grain-free tropical fruit and fish formula for cats.',
    imageUrl: 'https://placehold.co/400x400/0277BD/FFFFFF?text=Farmina+Cat',
    amazonAsin: 'B07FARCATSTR01', flipkartFsin: 'FSIN-FAR-CAT-STR-001',
    variants: [{ value: '1.5kg', price: 2580, stock: 20 }, { value: '10kg', price: 15200, stock: 4 }]
  },
  {
    id: 13, internalSku: 'RC-CAT-HAIR-001', barcode: '3182550710428',
    name: 'Royal Canin Hairball Care Adult Cat Dry Food',
    brand: 'Royal Canin', manufacturer: 'Royal Canin SAS',
    category: 'Cat Food', subCategory: 'Hairball Control', animalType: 'cat',
    weight: '2kg', mrp: 1890, costPrice: 1350,
    description: 'Controls hairball formation and supports intestinal transit.',
    imageUrl: 'https://placehold.co/400x400/C62828/FFFFFF?text=RC+Hairball',
    amazonAsin: 'B07RCCATHAIR01', flipkartFsin: 'FSIN-RC-CAT-HAIR-001',
    variants: [{ value: '2kg', price: 1890, stock: 30 }, { value: '4kg', price: 3600, stock: 12 }]
  },
  // Dog supplements & medicines
  {
    id: 14, internalSku: 'HIM-ERINA-001', barcode: '8901396128701',
    name: 'Himalaya Erina-EP Tick & Flea Control Dog Shampoo',
    brand: 'Himalaya', manufacturer: 'Himalaya Drug Company',
    category: 'Pet Grooming', subCategory: 'Tick & Flea', animalType: 'dog',
    weight: '200ml', mrp: 175, costPrice: 100,
    description: 'Herbal tick and flea control shampoo for dogs.',
    imageUrl: 'https://placehold.co/400x400/2E7D32/FFFFFF?text=Himalaya+Erina',
    amazonAsin: 'B07HIMERINA01', flipkartFsin: 'FSIN-HIM-ERINA-001',
    variants: [{ value: '200ml', price: 175, stock: 120 }, { value: '400ml', price: 320, stock: 60 }]
  },
  {
    id: 15, internalSku: 'VIV-OMEG-001', barcode: '8906012300789',
    name: 'Vivaldis Omega 3 Fish Oil Supplement for Dogs & Cats',
    brand: 'Vivaldis', manufacturer: 'Vivaldis Animal Health',
    category: 'Vitamins & Supplements', subCategory: 'Omega 3', animalType: 'dog',
    weight: '30 soft gels', mrp: 649, costPrice: 420,
    description: 'Omega-3 fatty acids for healthy skin, coat and joints.',
    imageUrl: 'https://placehold.co/400x400/6A1B9A/FFFFFF?text=Vivaldis+Omega3',
    amazonAsin: 'B07VIVOMEG01', flipkartFsin: 'FSIN-VIV-OMEG-001',
    variants: [{ value: '30 gels', price: 649, stock: 55 }, { value: '60 gels', price: 1199, stock: 28 }]
  },
  {
    id: 16, internalSku: 'VET-PROB-001', barcode: '8906080200123',
    name: 'Vets Kitchen Probiotic Supplement for Dogs',
    brand: 'Vets Kitchen', manufacturer: 'Vets Kitchen Pvt Ltd',
    category: 'Vitamins & Supplements', subCategory: 'Probiotic', animalType: 'dog',
    weight: '100g', mrp: 499, costPrice: 310,
    description: 'Live probiotic cultures to support digestive health in dogs.',
    imageUrl: 'https://placehold.co/400x400/00695C/FFFFFF?text=Vets+Probiotic',
    amazonAsin: 'B07VETPROB01', flipkartFsin: 'FSIN-VET-PROB-001',
    variants: [{ value: '100g', price: 499, stock: 45 }]
  },
  {
    id: 17, internalSku: 'DRL-PUP-001', barcode: '8906072700456',
    name: 'Drools Puppy Starter Super Premium Dog Dry Food',
    brand: 'Drools', manufacturer: 'Drools Pet Food Pvt Ltd',
    category: 'Dog Food', subCategory: 'Puppy', animalType: 'dog',
    weight: '3kg', mrp: 849, costPrice: 580,
    description: 'Complete nutrition for puppies from weaning to 4 months.',
    imageUrl: 'https://placehold.co/400x400/E65100/FFFFFF?text=Drools+Puppy',
    amazonAsin: 'B07DRLPUP01', flipkartFsin: 'FSIN-DRL-PUP-001',
    variants: [{ value: '3kg', price: 849, stock: 65 }, { value: '6kg', price: 1698, stock: 30 }]
  },
  {
    id: 18, internalSku: 'PED-ADT-001', barcode: '8901067120123',
    name: 'Pedigree Adult Complete Nutrition Chicken & Vegetables',
    brand: 'Pedigree', manufacturer: 'Mars Petcare India Pvt Ltd',
    category: 'Dog Food', subCategory: 'Adult', animalType: 'dog',
    weight: '3kg', mrp: 699, costPrice: 490,
    description: 'Complete and balanced nutrition for adult dogs.',
    imageUrl: 'https://placehold.co/400x400/D32F2F/FFFFFF?text=Pedigree+Adult',
    amazonAsin: 'B07PEDADT01', flipkartFsin: 'FSIN-PED-ADT-001',
    variants: [{ value: '3kg', price: 699, stock: 95 }, { value: '6kg', price: 1398, stock: 45 }, { value: '15kg', price: 2999, stock: 20 }]
  },
  {
    id: 19, internalSku: 'WIS-CHICK-001', barcode: '8906090100123',
    name: 'Whiskas Adult Chicken in Jelly Wet Cat Food',
    brand: 'Whiskas', manufacturer: 'Mars Petcare India Pvt Ltd',
    category: 'Cat Food', subCategory: 'Wet Food', animalType: 'cat',
    weight: '85g x 12', mrp: 588, costPrice: 400,
    description: 'Succulent chicken in jelly for adult cats.',
    imageUrl: 'https://placehold.co/400x400/7B1FA2/FFFFFF?text=Whiskas+Chicken',
    amazonAsin: 'B07WISCHICK01', flipkartFsin: 'FSIN-WIS-CHICK-001',
    variants: [{ value: '12x85g', price: 588, stock: 75 }, { value: '24x85g', price: 1176, stock: 38 }]
  },
  {
    id: 20, internalSku: 'DRL-CAT-001', barcode: '8906072704567',
    name: 'Drools Adult Cat Ocean Fish & Rice Dry Food',
    brand: 'Drools', manufacturer: 'Drools Pet Food Pvt Ltd',
    category: 'Cat Food', subCategory: 'Adult', animalType: 'cat',
    weight: '1kg', mrp: 369, costPrice: 240,
    description: 'Ocean fish and rice formula for healthy adult cats.',
    imageUrl: 'https://placehold.co/400x400/E65100/FFFFFF?text=Drools+Cat',
    amazonAsin: 'B07DRLCAT01', flipkartFsin: 'FSIN-DRL-CAT-001',
    variants: [{ value: '1kg', price: 369, stock: 85 }, { value: '3kg', price: 989, stock: 42 }]
  },
  // Tick & flea / dewormers
  {
    id: 21, internalSku: 'FIP-SPOT-001', barcode: '3661103007502',
    name: 'Fiprofort Plus Spot-On for Dogs (10-20kg)',
    brand: 'Fiprofort', manufacturer: 'Sava Healthcare Ltd',
    category: 'Dog Medicine', subCategory: 'Tick & Flea', animalType: 'dog',
    weight: '1.34ml x 3', mrp: 549, costPrice: 350,
    description: 'Monthly spot-on for tick and flea control in medium dogs.',
    imageUrl: 'https://placehold.co/400x400/558B2F/FFFFFF?text=Fiprofort+Plus',
    amazonAsin: 'B07FIPSPOT01', flipkartFsin: 'FSIN-FIP-SPOT-001',
    variants: [{ value: 'Small (2-10kg)', price: 449, stock: 60 }, { value: 'Medium (10-20kg)', price: 549, stock: 55 }, { value: 'Large (20-40kg)', price: 649, stock: 40 }]
  },
  {
    id: 22, internalSku: 'DRO-PUP-001', barcode: '5010106928505',
    name: 'Drontal Puppy Suspension Dewormer',
    brand: 'Drontal', manufacturer: 'Bayer Animal Health',
    category: 'Dog Medicine', subCategory: 'Dewormer', animalType: 'dog',
    weight: '50ml', mrp: 420, costPrice: 280,
    description: 'Broad-spectrum dewormer suspension for puppies.',
    imageUrl: 'https://placehold.co/400x400/1565C0/FFFFFF?text=Drontal+Puppy',
    amazonAsin: 'B07DROPUP01', flipkartFsin: 'FSIN-DRO-PUP-001',
    variants: [{ value: '50ml', price: 420, stock: 48 }]
  },
  {
    id: 23, internalSku: 'NKASURE-001', barcode: '8906059000123',
    name: 'NK Sure Tick & Flea Collar for Dogs — 8 months',
    brand: 'NK Sure', manufacturer: 'Nootie India',
    category: 'Dog Medicine', subCategory: 'Tick & Flea', animalType: 'dog',
    weight: '1 collar', mrp: 699, costPrice: 450,
    description: 'Long-lasting 8-month tick and flea collar for dogs.',
    imageUrl: 'https://placehold.co/400x400/5D4037/FFFFFF?text=NK+Sure+Collar',
    amazonAsin: 'B07NKSURE01', flipkartFsin: 'FSIN-NKASURE-001',
    variants: [{ value: 'Small', price: 699, stock: 35 }, { value: 'Large', price: 799, stock: 28 }]
  },
  // Bird food
  {
    id: 24, internalSku: 'TUT-SEED-001', barcode: '8906070100456',
    name: 'Tuts Natural Premium Bird Seed Mix',
    brand: 'Tuts Natural', manufacturer: 'Tuts Natural Pvt Ltd',
    category: 'Bird Food', subCategory: 'Seed Mix', animalType: 'bird',
    weight: '500g', mrp: 199, costPrice: 120,
    description: 'Premium mixed seeds for parrots, budgerigars and other pet birds.',
    imageUrl: 'https://placehold.co/400x400/33691E/FFFFFF?text=Bird+Seeds',
    amazonAsin: 'B07TUTSEED01', flipkartFsin: 'FSIN-TUT-SEED-001',
    variants: [{ value: '500g', price: 199, stock: 90 }, { value: '1kg', price: 359, stock: 55 }]
  },
  {
    id: 25, internalSku: 'PARRK-001', barcode: '8906080300123',
    name: 'Parrot Krunch Pelleted Diet for Medium Parrots',
    brand: 'Parrot Krunch', manufacturer: 'PetCare India',
    category: 'Bird Food', subCategory: 'Pelleted Diet', animalType: 'bird',
    weight: '700g', mrp: 449, costPrice: 280,
    description: 'Nutritionally complete pellets for African Grey and Amazon parrots.',
    imageUrl: 'https://placehold.co/400x400/558B2F/FFFFFF?text=Parrot+Krunch',
    amazonAsin: 'B07PARRK01', flipkartFsin: 'FSIN-PARRK-001',
    variants: [{ value: '700g', price: 449, stock: 40 }]
  },
  // More dog & cat products
  {
    id: 26, internalSku: 'NUTRP-001', barcode: '0070155022123',
    name: 'Nutri-Vet Hip & Joint Chewables for Dogs',
    brand: 'Nutri-Vet', manufacturer: 'Nutri-Vet LLC',
    category: 'Vitamins & Supplements', subCategory: 'Joint Support', animalType: 'dog',
    weight: '60 chews', mrp: 1299, costPrice: 850,
    description: 'Glucosamine and chondroitin chewables for joint health.',
    imageUrl: 'https://placehold.co/400x400/BF360C/FFFFFF?text=Nutri-Vet+Joint',
    amazonAsin: 'B07NUTRP01', flipkartFsin: 'FSIN-NUTRP-001',
    variants: [{ value: '60 chews', price: 1299, stock: 32 }, { value: '120 chews', price: 2299, stock: 15 }]
  },
  {
    id: 27, internalSku: 'RC-SKIN-001', barcode: '3182550710374',
    name: 'Royal Canin Skin Care Adult Dog Dry Food',
    brand: 'Royal Canin', manufacturer: 'Royal Canin SAS',
    category: 'Dog Food', subCategory: 'Skin Care', animalType: 'dog',
    weight: '2kg', mrp: 2100, costPrice: 1500,
    description: 'Supports a healthy skin barrier for sensitive skin dogs.',
    imageUrl: 'https://placehold.co/400x400/1A7F5A/FFFFFF?text=RC+Skin+Care',
    amazonAsin: 'B07RCSKIN01', flipkartFsin: 'FSIN-RC-SKIN-001',
    variants: [{ value: '2kg', price: 2100, stock: 20 }, { value: '11kg', price: 9800, stock: 6 }]
  },
  {
    id: 28, internalSku: 'HILLS-METABOLIC-001', barcode: '0052742715681',
    name: "Hill's Prescription Diet Metabolic Weight Management Dog Food",
    brand: "Hill's", manufacturer: "Hill's Pet Nutrition",
    category: 'Dog Medicine', subCategory: 'Weight Management', animalType: 'dog',
    weight: '1.5kg', mrp: 2800, costPrice: 2100,
    description: 'Clinical nutrition that activates your dog\'s own metabolism to burn fat.',
    imageUrl: 'https://placehold.co/400x400/37474F/FFFFFF?text=Hills+Metabolic',
    amazonAsin: 'B07HILLSMET01', flipkartFsin: 'FSIN-HILLS-METABOLIC-001',
    variants: [{ value: '1.5kg', price: 2800, stock: 12 }, { value: '4kg', price: 6500, stock: 5 }]
  },
  {
    id: 29, internalSku: 'VIV-CALCI-001', barcode: '8906012300567',
    name: 'Vivaldis Calcivit Calcium Supplement for Dogs',
    brand: 'Vivaldis', manufacturer: 'Vivaldis Animal Health',
    category: 'Vitamins & Supplements', subCategory: 'Calcium', animalType: 'dog',
    weight: '30 tabs', mrp: 349, costPrice: 210,
    description: 'Calcium and Vitamin D3 supplement for bone health in dogs.',
    imageUrl: 'https://placehold.co/400x400/6A1B9A/FFFFFF?text=Vivaldis+Calci',
    amazonAsin: 'B07VIVCALCI01', flipkartFsin: 'FSIN-VIV-CALCI-001',
    variants: [{ value: '30 tabs', price: 349, stock: 70 }, { value: '100 tabs', price: 899, stock: 30 }]
  },
  {
    id: 30, internalSku: 'NOOT-SHMP-001', barcode: '8906059001234',
    name: 'Nootie Moisturising & Conditioning Dog Shampoo',
    brand: 'Nootie', manufacturer: 'Nootie India',
    category: 'Pet Grooming', subCategory: 'Shampoo', animalType: 'dog',
    weight: '473ml', mrp: 749, costPrice: 480,
    description: 'Moisturising shampoo with Awapuhi extract for soft shiny coats.',
    imageUrl: 'https://placehold.co/400x400/E91E63/FFFFFF?text=Nootie+Shampoo',
    amazonAsin: 'B07NOOTSHMP01', flipkartFsin: 'FSIN-NOOT-SHMP-001',
    variants: [{ value: '473ml', price: 749, stock: 48 }, { value: '946ml', price: 1299, stock: 22 }]
  },
];

module.exports = { products };
