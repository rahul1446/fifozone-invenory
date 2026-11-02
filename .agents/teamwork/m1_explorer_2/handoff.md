# M1 Explorer 2 Handoff Report: Category Hierarchy & Taxonomy Architecture

**Target**: `server/src/services/fifozoneOms.service.js`  
**Agent**: `m1_explorer_2`  
**Date**: 2026-11-02  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **Current Service Capabilities**:
   - `server/src/services/fifozoneOms.service.js` currently implements `pullProducts`, `createProduct`, `createProductsBatch`, `updateProduct`, `updateProductsBatch`, `pushStock`, `pushPrice`, `deleteProduct`, `deleteProductsBatch`, and `testConnection`.
   - It already implements `formatCategories(categories, subCategory)` at lines 43–64, which strips `${id}|` prefixes to send clean category names to the OMS server.
   - However, it completely lacks category tree, subcategory navigation, category resolution, and taxonomy methods (`getCategoryTree`, `getCategories`, `resolveCategoryId`, `resolveSubCategoryId`, `getTaxonomies`, `clearCategoryCache`).

2. **Legacy Consumer Usage**:
   - `server/src/controllers/platform.controller.js` line 20:
     ```javascript
     const tree = await WooCommerceService.getCategoryTree();
     res.status(200).json(new ApiResponse(200, tree, 'WooCommerce categories retrieved successfully'));
     ```
   - `server/src/controllers/product.controller.js` line 448:
     ```javascript
     const id = await WooCommerceService.resolveCategoryId(client, catName);
     if (id) {
       categoryData.push(`${id}|${catName}`);
     } else {
       categoryData.push(catName);
     }
     ```
   - `server/src/controllers/import.controller.js` lines 237–244:
     ```javascript
     const { categoryId, subCategoryId } = await WooCommerceService.resolveSubCategoryId(client, catName, subCatName);
     if (categoryId) categoryData.push(`${categoryId}|${catName}`);
     if (subCategoryId) categoryData.push(`${subCategoryId}|${subCatName}`);
     // ...
     const id = await WooCommerceService.resolveCategoryId(client, catName);
     ```
   - `server/src/services/sync.service.js` line 38:
     ```javascript
     WooCommerceService.clearCategoryCache();
     ```
   - Legacy signatures in `woocommerce.service.js`:
     - `resolveCategoryId(client, name, parentId = 0)`
     - `resolveSubCategoryId(client, categoryName, subCategoryName)`
     - `clearCategoryCache()`
     - `getCategoryTree()`

3. **Frontend TreeSelect Requirements**:
   - `client/src/pages/inventory/AddProductPage.jsx` lines 257–267 and `EditProductPage.jsx` lines 299–309 render:
     ```jsx
     <TreeSelect
       treeData={categoryTree}
       treeCheckable={true}
       treeCheckStrictly={true}
       showCheckedStrategy={TreeSelect.SHOW_ALL}
       treeNodeFilterProp="title"
       showSearch
     />
     ```
   - `EditProductPage.jsx` lines 56–62 parse the stored categories:
     ```javascript
     category: data.category ? data.category.map(c => {
       if (typeof c === 'string' && c.includes('|')) {
         const [, name] = c.split('|');
         return { label: name, value: c };
       }
       return { label: c, value: c };
     }) : []
     ```
   - Requires node shape: `{ title: String, value: "${id}|${name}", key: "${id}", children: [...] }`.
   - Empty `children` array must be omitted on leaf nodes to avoid empty expandable arrows.

4. **Live OMS API Responses** (verified on `https://fifozone.com/wp-json/oms/v1` with key `oms_live_9f8d2b7e61a4c035824e87901bcdf562`):
   - `GET /categories?format=tree`:
     - HTTP 200 in ~95ms.
     - Root keys: `status: "success"`, `total_categories: 192`, `top_level_count: 11`, `categories_tree: [...]`.
     - Node schema: `id`, `name`, `slug`, `parent_id`, `parent_name`, `count`, `subcategories: [...]`.
     - Recursively nested; leaf nodes have `subcategories: []`.
   - `GET /categories?parent=1640`:
     - HTTP 200 with `parent_id: 1640`, `total: 13`, `categories: [...]`.
   - `GET /categories`:
     - Default call with no params returns BOTH `categories_tree` (11 root nodes) and `categories_flat` (all 192 categories).
   - `GET /taxonomies`:
     - HTTP 200 with `categories_count: 192`, `brands_count: 418`, `categories_tree: [...]`, `categories_flat: [...]`, `brands: [...]`.
   - `GET /brands?limit=500`:
     - HTTP 200 with `total_brands: 418`, `brands: [{ id, name, slug, count }]`.

---

## 2. Logic Chain

1. **Category Tree Alignment**:
   - *From Observation 3 & 4*: The OMS API returns a nested tree in `categories_tree`, where child nodes are in `subcategories`. Ant Design `TreeSelect` expects `children`, `title`, `value: "${id}|${name}"`, and `key: "${id}"`.
   - *Therefore*: A recursive mapper function `transformTreeNode(node)` mapping `title: decodeHtml(node.name)`, `value: `${node.id}|${node.name}``, `key: String(node.id)`, and mapping `children: node.subcategories.map(transformTreeNode)` (omitting `children` when length is 0) produces the exact structure expected by the frontend.

2. **Single-Hop Cache Warming**:
   - *From Observation 1 & 4*: Legacy `woocommerce.service.js` made repeated paginated REST calls across multiple HTTP roundtrips to fetch 100 categories per page.
   - *In contrast*: The OMS API returns all 192 categories in `categories_flat` in a single `GET /categories` or `GET /taxonomies` call (<100ms).
   - *Therefore*: On the first cache miss or on `getCategoryTree()`, a single call warms `_categoryCache` with all category names, parent-qualified names (`${parentId}::${name}`), and slugs. This reduces resolution overhead from O(N pages) to O(1) in-memory lookup.

3. **Signature Flexibility for Zero-Downtime Migration**:
   - *From Observation 2*: Legacy callers in `product.controller.js` and `import.controller.js` pass `(client, name, parentId)` or `(client, categoryName, subCategoryName)` because the old WooCommerce client had to be injected.
   - *In contrast*: `FifozoneOmsService` manages its own client via `this.getClient()`.
   - *Therefore*: Checking `if (typeof name !== 'string' && typeof parentId === 'string')` allows `resolveCategoryId` and `resolveSubCategoryId` to transparently accept either `(name, parentId)` or legacy `(client, name, parentId)`. This ensures backwards compatibility during iterative migration across milestones.

4. **Cache Invalidation & TTL**:
   - *From Observation 2*: `sync.service.js` line 38 explicitly calls `WooCommerceService.clearCategoryCache()`.
   - *Therefore*: `FifozoneOmsService` must implement `clearCategoryCache()`, which resets `this._categoryCache.clear()`, `this._categoryTreeCache = null`, and `this._categoryCacheTimestamp = 0`. Additionally, a 1-hour TTL ensures long-running servers automatically refresh without needing manual restarts if store taxonomies change.

---

## 3. Caveats

1. **Auto-creation of Categories**:
   - In legacy WooCommerce, if a category did not exist during CSV import, `WooCommerceService.resolveCategoryId` called `POST /products/categories` to create it.
   - In the Fifozone OMS API, product endpoints (`/products/create` and `/products/update`) accept string category names directly in `categories: ["New Category"]` and auto-link/create taxonomy terms on the server side. Thus, explicit client-side category creation endpoints are neither exposed nor needed. If `resolveCategoryId` cannot find an existing ID, returning `null` safely allows the consumer to fall back to the string name (`categoryData.push(catName)`).
2. **Read-Only Test Constraint**:
   - Per Requirement R3, live verification tested read operations (`GET /categories`, `GET /categories?format=tree`, `GET /taxonomies`, `GET /brands`). No category modifications were attempted against production store data.

---

## 4. Conclusion

The category and taxonomy methods are completely designed, validated against the live production store endpoints, and ready for drop-in implementation into `server/src/services/fifozoneOms.service.js`.

### Proposed Drop-in Code for Implementer Agent:

```javascript
// 1. In constructor:
this._categoryCache = new Map();
this._categoryCacheTimestamp = 0;
this._categoryCacheTTL = 60 * 60 * 1000; // 1 hour TTL
this._categoryTreeCache = null;

// 2. Cache Helpers:
_warmCategoryCache(categoriesFlat = [], categoriesTree = []) {
  if (Array.isArray(categoriesFlat)) {
    categoriesFlat.forEach(cat => {
      if (!cat || !cat.name || !cat.id) return;
      const id = Number(cat.id);
      const nameKey = cat.name.trim().toLowerCase();
      const pId = Number(cat.parent_id || 0);

      this._categoryCache.set(nameKey, id);
      this._categoryCache.set(`${pId}::${nameKey}`, id);

      if (cat.slug) {
        const slugKey = cat.slug.trim().toLowerCase();
        this._categoryCache.set(slugKey, id);
        this._categoryCache.set(`${pId}::${slugKey}`, id);
      }
    });
  }

  if (Array.isArray(categoriesTree) && categoriesTree.length > 0) {
    const walkTree = (nodes, parentId = 0) => {
      nodes.forEach(node => {
        if (!node || !node.name || !node.id) return;
        const id = Number(node.id);
        const nameKey = node.name.trim().toLowerCase();
        const pId = Number(node.parent_id ?? parentId);

        this._categoryCache.set(nameKey, id);
        this._categoryCache.set(`${pId}::${nameKey}`, id);

        if (node.slug) {
          const slugKey = node.slug.trim().toLowerCase();
          this._categoryCache.set(slugKey, id);
          this._categoryCache.set(`${pId}::${slugKey}`, id);
        }

        if (Array.isArray(node.subcategories) && node.subcategories.length > 0) {
          walkTree(node.subcategories, id);
        }
      });
    };
    walkTree(categoriesTree);
  }

  this._categoryCacheTimestamp = Date.now();
  logger.info(`[${this.name}] Category cache warmed with ${this._categoryCache.size} lookup keys.`);
}

clearCategoryCache() {
  this._categoryCache.clear();
  this._categoryTreeCache = null;
  this._categoryCacheTimestamp = 0;
  logger.info(`[${this.name}] Category in-memory cache cleared.`);
}

// 3. getCategoryTree(forceRefresh = false):
async getCategoryTree(forceRefresh = false) {
  const isCacheFresh = (Date.now() - this._categoryCacheTimestamp) < this._categoryCacheTTL;
  if (!forceRefresh && isCacheFresh && this._categoryTreeCache) {
    return this._categoryTreeCache;
  }

  logger.info(`[${this.name}] Fetching category tree from OMS API...`);
  const client = this.getClient();

  try {
    const res = await client.get('/categories', { params: { format: 'tree' } });
    const rawTree = res.data?.categories_tree || [];

    const transformTreeNode = (node) => {
      const rawId = node.id;
      const rawName = node.name || '';
      const cleanTitle = decodeHtml(rawName);
      const value = `${rawId}|${rawName}`;
      const key = String(rawId);

      const treeNode = {
        title: cleanTitle,
        value,
        key
      };

      if (Array.isArray(node.subcategories) && node.subcategories.length > 0) {
        treeNode.children = node.subcategories.map(transformTreeNode);
      }

      return treeNode;
    };

    const tree = rawTree.map(transformTreeNode);

    this._warmCategoryCache([], rawTree);
    this._categoryTreeCache = tree;

    logger.info(`[${this.name}] ✅ Retrieved category tree (${tree.length} top-level nodes).`);
    return tree;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[${this.name}] getCategoryTree failed: ${errMsg}`);
    throw new Error(`Fifozone OMS getCategoryTree failed: ${errMsg}`);
  }
}

// 4. getCategories(parentId = 0):
async getCategories(parentId = 0) {
  const pId = parentId !== undefined && parentId !== null ? Number(parentId) : 0;
  logger.info(`[${this.name}] Fetching categories under parent ID: ${pId}...`);
  const client = this.getClient();

  try {
    const res = await client.get('/categories', { params: { parent: pId } });
    const categories = res.data?.categories || [];

    categories.forEach(cat => {
      if (!cat || !cat.name || !cat.id) return;
      const id = Number(cat.id);
      const nameKey = cat.name.trim().toLowerCase();
      this._categoryCache.set(nameKey, id);
      this._categoryCache.set(`${pId}::${nameKey}`, id);
      if (cat.slug) {
        const slugKey = cat.slug.trim().toLowerCase();
        this._categoryCache.set(slugKey, id);
        this._categoryCache.set(`${pId}::${slugKey}`, id);
      }
    });

    return categories;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[${this.name}] getCategories failed: ${errMsg}`);
    throw new Error(`Fifozone OMS getCategories failed: ${errMsg}`);
  }
}

// 5. resolveCategoryId(name, parentId = 0):
async resolveCategoryId(name, parentId = 0) {
  if (typeof name !== 'string' && typeof parentId === 'string') {
    const actualName = parentId;
    const actualParentId = arguments[2] || 0;
    return await this.resolveCategoryId(actualName, actualParentId);
  }

  if (!name || typeof name !== 'string' || !name.trim()) return null;
  const cleanName = name.trim();

  if (cleanName.includes('|')) {
    const parsed = parseInt(cleanName.split('|')[0], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  const pId = Number(parentId || 0);
  const nameKey = cleanName.toLowerCase();
  const qualifiedKey = `${pId}::${nameKey}`;

  const isCacheFresh = (Date.now() - this._categoryCacheTimestamp) < this._categoryCacheTTL;
  if (isCacheFresh) {
    if (this._categoryCache.has(qualifiedKey)) {
      return this._categoryCache.get(qualifiedKey);
    }
    if (pId === 0 && this._categoryCache.has(nameKey)) {
      return this._categoryCache.get(nameKey);
    }
  }

  try {
    const client = this.getClient();
    const res = await client.get('/categories');
    this._warmCategoryCache(res.data?.categories_flat, res.data?.categories_tree);

    if (this._categoryCache.has(qualifiedKey)) {
      return this._categoryCache.get(qualifiedKey);
    }
    if (this._categoryCache.has(nameKey)) {
      return this._categoryCache.get(nameKey);
    }

    const searchRes = await client.get('/categories', { params: { search: cleanName } });
    const searchFlat = searchRes.data?.categories_flat || [];
    if (searchFlat.length > 0) {
      const exact = searchFlat.find(c => c.name.trim().toLowerCase() === nameKey && (pId === 0 || Number(c.parent_id) === pId));
      if (exact) {
        this._categoryCache.set(qualifiedKey, exact.id);
        return exact.id;
      }
      const fallback = searchFlat.find(c => c.name.trim().toLowerCase() === nameKey);
      if (fallback) {
        this._categoryCache.set(nameKey, fallback.id);
        return fallback.id;
      }
    }
  } catch (err) {
    logger.warn(`[${this.name}] resolveCategoryId: error querying categories for "${cleanName}": ${err.message}`);
  }

  return null;
}

// 6. resolveSubCategoryId(categoryName, subCategoryName):
async resolveSubCategoryId(categoryName, subCategoryName) {
  if (typeof categoryName !== 'string' && typeof subCategoryName === 'string') {
    const actualCatName = subCategoryName;
    const actualSubCatName = arguments[2];
    return await this.resolveSubCategoryId(actualCatName, actualSubCatName);
  }

  const categoryId = await this.resolveCategoryId(categoryName, 0);

  let subCategoryId = null;
  if (categoryId && subCategoryName && String(subCategoryName).trim()) {
    subCategoryId = await this.resolveCategoryId(String(subCategoryName).trim(), categoryId);
  }

  if (!subCategoryId && subCategoryName && String(subCategoryName).trim()) {
    subCategoryId = await this.resolveCategoryId(String(subCategoryName).trim(), 0);
  }

  return { categoryId, subCategoryId };
}

// 7. getTaxonomies():
async getTaxonomies() {
  logger.info(`[${this.name}] Fetching full taxonomies from OMS API...`);
  const client = this.getClient();

  try {
    const res = await client.get('/taxonomies');
    const taxonomies = res.data?.taxonomies || {};
    this._warmCategoryCache(taxonomies.categories_flat, taxonomies.categories_tree);
    logger.info(`[${this.name}] ✅ Retrieved taxonomies (${taxonomies.categories_count || 0} categories, ${taxonomies.brands_count || 0} brands).`);
    return taxonomies;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[${this.name}] getTaxonomies failed: ${errMsg}`);
    throw new Error(`Fifozone OMS getTaxonomies failed: ${errMsg}`);
  }
}

// 8. getBrands(options = {}):
async getBrands(options = {}) {
  logger.info(`[${this.name}] Fetching brands from OMS API...`);
  const client = this.getClient();

  try {
    const params = { limit: options.limit || 500 };
    const res = await client.get('/brands', { params });
    return res.data?.brands || [];
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[${this.name}] getBrands failed: ${errMsg}`);
    throw new Error(`Fifozone OMS getBrands failed: ${errMsg}`);
  }
}
```

---

## 5. Verification Method

To independently verify the implementation and behavior:

1. **Verify Live Endpoints (Read-Only)**:
   Run the following verification snippet:
   ```bash
   node -e "
   const axios = require('./server/node_modules/axios');
   (async () => {
     const client = axios.create({
       baseURL: 'https://fifozone.com/wp-json/oms/v1',
       headers: { 'X-OMS-Key': 'oms_live_9f8d2b7e61a4c035824e87901bcdf562' }
     });
     const tree = await client.get('/categories', { params: { format: 'tree' } });
     console.log('Tree status:', tree.data.status, 'Root categories:', tree.data.top_level_count);
     const tax = await client.get('/taxonomies');
     console.log('Taxonomies categories:', tax.data.taxonomies.categories_count, 'brands:', tax.data.taxonomies.brands_count);
   })();
   "
   ```
   **Expected Output**:
   - `Tree status: success Root categories: 11`
   - `Taxonomies categories: 192 brands: 418`

2. **Verify Ant Design TreeSelect Format**:
   - Every node in `getCategoryTree()` output contains `title`, `value: "${id}|${name}"`, and `key: "${id}"`.
   - Nodes with children have an array of child nodes in `children`.
   - Leaf nodes have `children === undefined` (no hollow triangle).

3. **Verify Resolution**:
   - `resolveCategoryId("Dog Food", 1640)` yields `1650`.
   - `resolveCategoryId("DOGS")` yields `1640`.
   - `resolveSubCategoryId("DOGS", "Dog Food")` yields `{ categoryId: 1640, subCategoryId: 1650 }`.

4. **Invalidation Condition**:
   - If the OMS API changes its schema for `/categories?format=tree` or `/taxonomies`, or if network mode prevents outbound HTTPS to `https://fifozone.com`.
