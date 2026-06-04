import React, { useState, useCallback, useRef } from 'react';
import {
  Modal, Steps, Button, Table, Tag, Progress, Spin, Collapse,
  Form, Input, InputNumber, Select, Alert, Checkbox
} from 'antd';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, ChevronLeft, Download, RefreshCw, Eye,
  SkipForward, Edit3, CloudUpload, FileText, X, Info, FastForward
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { validateImportApi, uploadImportApi, downloadImportTemplateApi } from '../../api/importApi';

const { Option } = Select;
const { Panel } = Collapse;

// ─── Field definitions for column mapping ───────────────────────────────────────
const PRODUCT_FIELDS = [
  { key: 'masterName', label: 'Product Name *', required: true },
  { key: 'sku', label: 'SKU' },
  { key: 'barcode', label: 'Barcode / EAN' },
  { key: 'brand', label: 'Brand' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'animalType', label: 'Animal Type (dog,cat,...)' },
  { key: 'weight_value', label: 'Weight Value' },
  { key: 'weight_unit', label: 'Weight Unit (g/kg/ml/l)' },
  { key: 'packSize', label: 'Pack Size' },
  { key: 'mrp', label: 'MRP (₹)' },
  { key: 'costPrice', label: 'Cost Price (₹)' },
  { key: 'gstPercent', label: 'GST %' },
  { key: 'sellingPrice_fifozone', label: 'Fifozone Selling Price' },
  { key: 'sellingPrice_amazon', label: 'Amazon Selling Price' },
  { key: 'sellingPrice_flipkart', label: 'Flipkart Selling Price' },
  { key: 'totalStock', label: 'Total Stock' },
  { key: 'lowStockThreshold', label: 'Low Stock Threshold' },
  { key: 'description', label: 'Description' },
  { key: 'shortDescription', label: 'Short Description' },
  { key: 'composition', label: 'Composition' },
  { key: 'usageInstructions', label: 'Usage Instructions' },
  { key: 'tags', label: 'Tags (comma-separated)' },
  { key: 'features', label: 'Features (pipe-separated)' },
  { key: 'platformId_fifozone', label: 'Fifozone Product ID' },
  { key: 'platformId_amazon', label: 'Amazon ASIN' },
  { key: 'platformId_flipkart', label: 'Flipkart FSIN' },
  { key: 'variant_name_1', label: 'Variant 1 Name' },
  { key: 'variant_value_1', label: 'Variant 1 Value' },
  { key: 'variant_price_1', label: 'Variant 1 Price' },
  { key: 'variant_stock_1', label: 'Variant 1 Stock' },
  { key: 'variant_name_2', label: 'Variant 2 Name' },
  { key: 'variant_value_2', label: 'Variant 2 Value' },
  { key: 'variant_price_2', label: 'Variant 2 Price' },
  { key: 'variant_stock_2', label: 'Variant 2 Stock' },
  { key: 'variant_name_3', label: 'Variant 3 Name' },
  { key: 'variant_value_3', label: 'Variant 3 Value' },
  { key: 'variant_price_3', label: 'Variant 3 Price' },
  { key: 'variant_stock_3', label: 'Variant 3 Stock' },
  { key: 'image_url_1', label: 'Image URL 1' },
  { key: 'image_url_2', label: 'Image URL 2' },
  { key: 'image_url_3', label: 'Image URL 3' },
  { key: 'image_url_4', label: 'Image URL 4' },
  { key: 'image_url_5', label: 'Image URL 5' },
];

// ─── Auto-mapping logic ──────────────────────────────────────────────────────────
const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const AUTO_MAP = {
  'productname': 'masterName', 'name': 'masterName', 'mastername': 'masterName', 'title': 'masterName',
  'sku': 'sku', 'stockkeepingunit': 'sku',
  'barcode': 'barcode', 'ean': 'barcode', 'upc': 'barcode',
  'brand': 'brand', 'brandname': 'brand',
  'manufacturer': 'manufacturer', 'mfg': 'manufacturer',
  'category': 'category', 'cat': 'category', 'productcategory': 'category',
  'subcategory': 'subCategory', 'subcat': 'subCategory',
  'animaltype': 'animalType', 'animal': 'animalType', 'pettype': 'animalType',
  'weightvalue': 'weight_value', 'weight': 'weight_value',
  'weightunit': 'weight_unit', 'unit': 'weight_unit',
  'packsize': 'packSize', 'pack': 'packSize',
  'mrp': 'mrp', 'maximumretailprice': 'mrp',
  'costprice': 'costPrice', 'cost': 'costPrice', 'purchaseprice': 'costPrice',
  'gst': 'gstPercent', 'gstpercent': 'gstPercent', 'taxrate': 'gstPercent',
  'fifozonePrice': 'sellingPrice_fifozone', 'fifozoneprice': 'sellingPrice_fifozone',
  'amazonprice': 'sellingPrice_amazon', 'flipkartprice': 'sellingPrice_flipkart',
  'totalstock': 'totalStock', 'stock': 'totalStock', 'quantity': 'totalStock', 'qty': 'totalStock',
  'lowstockthreshold': 'lowStockThreshold', 'reorderpoint': 'lowStockThreshold',
  'description': 'description', 'fulldescription': 'description',
  'shortdescription': 'shortDescription', 'excerpt': 'shortDescription',
  'composition': 'composition', 'ingredients': 'composition',
  'usageinstructions': 'usageInstructions', 'howto': 'usageInstructions',
  'tags': 'tags', 'keywords': 'tags',
  'features': 'features',
  'fifozoneproductid': 'platformId_fifozone', 'woocommerceid': 'platformId_fifozone',
  'amazonautosin': 'platformId_amazon', 'asin': 'platformId_amazon',
  'flipkartfsin': 'platformId_flipkart', 'fsin': 'platformId_flipkart',
  'imageurl1': 'image_url_1', 'image1': 'image_url_1', 'imageurl': 'image_url_1',
  'imageurl2': 'image_url_2', 'image2': 'image_url_2',
  'imageurl3': 'image_url_3', 'image3': 'image_url_3',
};

const autoMap = (header) => AUTO_MAP[normalize(header)] || null;

// ─── Status badge ────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    ready: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Ready', icon: <CheckCircle2 size={12} /> },
    incomplete: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Needs Review', icon: <AlertTriangle size={12} /> },
    invalid: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Invalid', icon: <XCircle size={12} /> },
    skipped: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Skipped', icon: <SkipForward size={12} /> },
    success: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Uploaded', icon: <CheckCircle2 size={12} /> },
    failed: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Failed', icon: <XCircle size={12} /> },
    duplicate: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Duplicate', icon: <AlertTriangle size={12} /> },
  };
  const c = cfg[status] || cfg.ready;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

// ─── Platform config ────────────────────────────────────────────────────────────
const PLATFORM_OPTIONS = [
  { key: 'fifozone', label: 'Fifozone', icon: '🛒', color: 'emerald' },
  { key: 'amazon',   label: 'Amazon',   icon: '📦', color: 'orange'  },
  { key: 'flipkart', label: 'Flipkart', icon: '🏪', color: 'blue'    },
];

// ─── Main ImportWizard Component ─────────────────────────────────────────────────
const ImportWizard = ({ open, onClose, onImportComplete }) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [validatedProducts, setValidatedProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [validating, setValidating] = useState(false);

  // ── Platform selection state ──
  const [selectedPlatforms, setSelectedPlatforms] = useState(['fifozone', 'amazon', 'flipkart']);
  const allPlatformsSelected = selectedPlatforms.length === 3;

  // Review flow state
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewDecisions, setReviewDecisions] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm] = Form.useForm();

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadLog, setUploadLog] = useState([]);

  const [closingConfirm, setClosingConfirm] = useState(false);

  // ── Reset all state ──
  const resetAll = () => {
    setStep(0); setFile(null); setRawHeaders([]); setRawRows([]);
    setColumnMapping({}); setValidatedProducts([]); setSummary(null);
    setReviewFilter('all'); setValidating(false);
    setReviewQueue([]); setReviewIndex(0); setReviewDecisions({});
    setEditingProduct(null); setShowEditModal(false);
    setUploading(false); setUploadProgress(0); setUploadResults(null); setUploadLog([]);
    setSelectedPlatforms(['fifozone', 'amazon', 'flipkart']);
  };

  const handleClose = () => {
    if (step > 0 && step < 3) {
      setClosingConfirm(true);
    } else {
      resetAll(); onClose();
    }
  };

  // ── Step 1: Parse file ──────────────────────────────────────────────────────
  const parseFile = useCallback((f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Invalid file type. Please upload a .csv or .xlsx file.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File is too large. Maximum allowed size is 10MB.');
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rows || rows.length < 2) {
          toast.error('This file appears to be empty. Please add product data and try again.');
          return;
        }

        const headers = rows[0].map(h => String(h).trim()).filter(Boolean);
        const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined));

        if (dataRows.length > 500) {
          toast.error('This file contains more than 500 products. Please split it into smaller files.');
          return;
        }

        setRawHeaders(headers);
        setRawRows(dataRows);

        // Auto-mapping
        const mapping = {};
        headers.forEach(h => {
          const mapped = autoMap(h);
          if (mapped) mapping[h] = mapped;
        });
        setColumnMapping(mapping);

        toast.success(`Parsed ${dataRows.length} products from "${f.name}"`);
        setTimeout(() => setStep(1), 500);
      } catch (err) {
        toast.error('Could not read this file. Please check if the file is corrupted and try again.');
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) parseFile(acceptedFiles[0]);
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
    noClick: false,
  });

  // ── Step 2: Apply column mapping and produce parsed products ──────────────────
  const applyMapping = () => {
    const parsed = rawRows.map((row, idx) => {
      const product = { _originalRowIndex: idx + 2 };
      rawHeaders.forEach((header, colIdx) => {
        const fieldKey = columnMapping[header];
        if (fieldKey && fieldKey !== '__ignore__') {
          product[fieldKey] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
        }
      });
      return product;
    }).filter(p => p.masterName && String(p.masterName).trim() !== '');

    return parsed;
  };

  const handleToReview = async () => {
    const parsed = applyMapping();

    if (parsed.length === 0) {
      toast.error('No valid products found after mapping. Make sure "Product Name" column is mapped.');
      return;
    }

    setValidating(true);
    try {
      const res = await validateImportApi(parsed);
      const data = res?.data;
      setValidatedProducts(data.products);
      setSummary(data.summary);
      setStep(2);
    } catch (err) {
      toast.error(`Validation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setValidating(false);
    }
  };

  // ── Step 3: Build review queue (only incomplete products) ─────────────────────
  const startReview = (mode = 'all') => {
    const incomplete = validatedProducts.filter(p => p._status === 'incomplete');
    if (mode === 'ready_only') {
      // Skip review, go straight to upload
      handleUpload(validatedProducts.filter(p => p._status === 'ready'), {});
    } else {
      setReviewQueue(incomplete);
      setReviewIndex(0);
      setReviewDecisions({});
    }
  };

  const currentReviewProduct = reviewQueue[reviewIndex];

  const handleReviewDecision = (decision, editedData = null) => {
    const product = currentReviewProduct;
    const idx = product._rowIndex;

    setReviewDecisions(prev => ({ ...prev, [idx]: decision }));
    if (decision === 'edited' && editedData) {
      // Merge edited data into validatedProducts
      setValidatedProducts(prev => prev.map((p, i) => {
        if (p._rowIndex === idx) return { ...p, ...editedData, _status: 'ready', _uploadAsIs: false };
        return p;
      }));
    }

    if (reviewIndex < reviewQueue.length - 1) {
      setReviewIndex(i => i + 1);
    } else {
      // All reviewed — start upload
      const decisions = { ...reviewDecisions, [idx]: decision };
      const toUpload = validatedProducts.filter(p => {
        if (p._status === 'ready') return true;
        if (p._status === 'incomplete') {
          const d = decisions[p._rowIndex];
          return d === 'upload_as_is' || d === 'edited';
        }
        return false;
      }).map(p => {
        const d = decisions[p._rowIndex];
        return { ...p, _uploadAsIs: d === 'upload_as_is' };
      });
      handleUpload(toUpload, decisions);
    }
  };

  const handleSkipAll = () => {
    // Apply "upload_as_is" to all remaining items in the queue
    const decisions = { ...reviewDecisions };
    for (let i = reviewIndex; i < reviewQueue.length; i++) {
      decisions[reviewQueue[i]._rowIndex] = 'upload_as_is';
    }
    setReviewDecisions(decisions);

    // All reviewed — start upload
    const toUpload = validatedProducts.filter(p => {
      if (p._status === 'ready') return true;
      if (p._status === 'incomplete') {
        const d = decisions[p._rowIndex];
        return d === 'upload_as_is' || d === 'edited';
      }
      return false;
    }).map(p => {
      const d = decisions[p._rowIndex];
      return { ...p, _uploadAsIs: d === 'upload_as_is' };
    });
    handleUpload(toUpload, decisions);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    editForm.setFieldsValue({
      masterName: product.masterName,
      brand: product.brand,
      category: product.category,
      mrp: product.mrp ? parseFloat(product.mrp) : undefined,
      costPrice: product.costPrice ? parseFloat(product.costPrice) : undefined,
      sellingPrice_fifozone: product.sellingPrice_fifozone ? parseFloat(product.sellingPrice_fifozone) : undefined,
      totalStock: product.totalStock ? parseInt(product.totalStock) : undefined,
    });
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    const values = editForm.getFieldsValue();
    setShowEditModal(false);
    handleReviewDecision('edited', values);
  };

  // ── Upload ───────────────────────────────────────────────────────────────────
  const handleUpload = async (toUpload, decisions) => {
    setStep(3);
    setUploading(true);
    setUploadLog([]);
    setUploadProgress(0);

    const batchId = `BATCH-${Date.now()}`;
    const batchSize = 10;
    const log = [];

    for (let i = 0; i < toUpload.length; i += batchSize) {
      const batch = toUpload.slice(i, i + batchSize);
      // Attach the selected platforms to each product in the batch
      const batchWithPlatforms = batch.map(p => ({ ...p, publishTo: selectedPlatforms }));
      try {
        const res = await uploadImportApi(batchWithPlatforms, batchId);
        const data = res?.data;
        if (data?.log) log.push(...data.log);
      } catch (err) {
        batch.forEach(p => log.push({ name: p.masterName, status: 'failed', message: err.message }));
      }
      setUploadProgress(Math.min(100, Math.round(((i + batchSize) / toUpload.length) * 100)));
      setUploadLog([...log]);
    }

    // Compute final results from log
    const results = {
      uploaded: log.filter(l => l.status === 'success').length,
      incomplete: log.filter(l => l.status === 'incomplete').length,
      skipped: validatedProducts.filter(p => {
        const d = decisions[p._rowIndex];
        return d === 'skip' || p._status === 'invalid';
      }).length,
      failed: log.filter(l => l.status === 'failed').length,
      duplicate: log.filter(l => l.status === 'duplicate').length,
      batchId,
    };

    setUploadResults(results);
    setUploading(false);
    setUploadProgress(100);

    toast.success(`Import complete! ${results.uploaded + results.incomplete} products uploaded.`);
  };

  // ── Download report ──────────────────────────────────────────────────────────
  const downloadReport = () => {
    const rows = [
      ['Product Name', 'Status', 'Missing Fields', 'Error/Note'],
      ...uploadLog.map(l => [l.name, l.status, '', l.message || '']),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Report');
    XLSX.writeFile(wb, `Fifozone_Import_Report_${Date.now()}.xlsx`);
  };

  // ── Filtered table data ──────────────────────────────────────────────────────
  const filteredProducts = validatedProducts.filter(p => {
    if (reviewFilter === 'all') return true;
    if (reviewFilter === 'ready') return p._status === 'ready';
    if (reviewFilter === 'incomplete') return p._status === 'incomplete';
    if (reviewFilter === 'invalid') return p._status === 'invalid';
    return true;
  });

  const reviewColumns = [
    { title: 'Row', dataIndex: '_originalRowIndex', key: 'row', width: 60, render: v => <span className="text-slate-400 text-xs">#{v}</span> },
    {
      title: 'Product Name', dataIndex: 'masterName', key: 'name', width: 220,
      render: v => <span className="font-medium text-slate-800 text-sm">{v || <span className="text-red-400 italic">Empty!</span>}</span>
    },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100, render: v => v || <span className="text-slate-300">—</span> },
    { title: 'Category', dataIndex: 'category', key: 'cat', width: 120, render: v => v || <span className="text-slate-300">—</span> },
    { title: 'MRP', dataIndex: 'mrp', key: 'mrp', width: 80, render: v => v ? `₹${v}` : <span className="text-slate-300">—</span> },
    { title: 'Stock', dataIndex: 'totalStock', key: 'stock', width: 70, render: v => v || <span className="text-slate-300">—</span> },
    { title: 'Images', key: 'imgs', width: 60, render: (_, p) => { const cnt = [1,2,3,4,5].filter(i => p[`image_url_${i}`]).length; return cnt || <span className="text-slate-300">0</span>; } },
    {
      title: 'Status', key: 'status', width: 120,
      render: (_, p) => <StatusBadge status={p._status} />
    },
    {
      title: 'Missing / Errors', key: 'missing', width: 200,
      render: (_, p) => {
        const items = [...(p._missingFields || []), ...(p._validationErrors || [])];
        return items.length ? (
          <div className="flex flex-wrap gap-1">
            {items.slice(0, 3).map(f => <span key={f} className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{f}</span>)}
            {items.length > 3 && <span className="text-xs text-slate-400">+{items.length - 3} more</span>}
          </div>
        ) : <span className="text-emerald-500 text-xs">All good ✓</span>;
      }
    },
    {
      title: 'Action', key: 'action', width: 80,
      render: (_, p) => p._status === 'ready'
        ? <CheckCircle2 size={16} className="text-emerald-500" />
        : p._status === 'incomplete'
        ? <Button size="small" type="link" className="!text-amber-600 !p-0">Review</Button>
        : <Button size="small" type="link" danger className="!p-0">Error</Button>
    },
  ];

  const logColors = { success: 'text-emerald-600', incomplete: 'text-amber-600', failed: 'text-red-600', duplicate: 'text-purple-600', skipped: 'text-slate-500' };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        width={960}
        centered
        maskClosable={false}
        title={null}
        bodyStyle={{ padding: 0 }}
        className="import-wizard-modal"
        style={{ top: 20 }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Import Products from CSV / Excel</h2>
              <p className="text-xs text-slate-500">Step {step + 1} of 4</p>
            </div>
          </div>
          <Button type="text" icon={<X size={18} />} onClick={handleClose} className="!text-slate-400" />
        </div>

        {/* ── Steps indicator ── */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white">
          <Steps
            current={step}
            size="small"
            items={[
              { title: 'Upload File', icon: <Upload size={14} /> },
              { title: 'Map Columns', icon: <Edit3 size={14} /> },
              { title: 'Review', icon: <Eye size={14} /> },
              { title: 'Done', icon: <CheckCircle2 size={14} /> },
            ]}
          />
        </div>

        {/* ── Step Content ── */}
        <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)', minHeight: 400 }}>

          {/* ════ STEP 0: Upload File ════ */}
          {step === 0 && (
            <div className="space-y-5">

              {/* ── Platform Selection ─────────────────────────────────────── */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Publish imported products to:</p>
                    <p className="text-xs text-slate-400 mt-0.5">Select which platforms these products will be listed on</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatforms(allPlatformsSelected ? [] : ['fifozone', 'amazon', 'flipkart'])}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                      allPlatformsSelected ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {allPlatformsSelected ? '✓ All Selected' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {PLATFORM_OPTIONS.map(p => {
                    const active = selectedPlatforms.includes(p.key);
                    const borderCls = active
                      ? p.color === 'emerald' ? 'border-emerald-400 bg-emerald-50' : p.color === 'orange' ? 'border-orange-400 bg-orange-50' : 'border-blue-400 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300';
                    const textCls = active
                      ? p.color === 'emerald' ? 'text-emerald-700' : p.color === 'orange' ? 'text-orange-700' : 'text-blue-700'
                      : 'text-slate-600';
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setSelectedPlatforms(prev => prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all w-full ${borderCls}`}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <div>
                          <p className={`font-bold text-xs ${textCls}`}>{p.label}</p>
                          {active && <span className={`text-[9px] font-semibold uppercase ${textCls}`}>✓ Selected</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedPlatforms.length === 0 && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">⚠ Select at least one platform to import</p>
                )}
                {selectedPlatforms.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    Products will be published to: <strong className="text-slate-600">{selectedPlatforms.join(', ')}</strong>
                  </p>
                )}
              </div>

              {/* Drop zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                    <CloudUpload size={32} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-700">
                      {isDragActive ? 'Drop your file here...' : 'Drag and drop your CSV or Excel file here'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">or <span className="text-emerald-600 underline">click to browse</span></p>
                  </div>
                  <p className="text-xs text-slate-400">Supported: .csv, .xlsx, .xls · Max 10MB · Max 500 products</p>
                </div>
              </div>

              {/* File preview */}
              {file && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <FileSpreadsheet size={24} className="text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · {rawRows.length} products found</p>
                  </div>
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <Button size="small" type="text" icon={<X size={14} />} onClick={() => { setFile(null); setRawHeaders([]); setRawRows([]); }} className="!text-slate-400" />
                </div>
              )}

              {/* Download template */}
              <div className="flex items-center justify-center">
                <Button
                  type="default"
                  icon={<Download size={15} />}
                  onClick={downloadImportTemplateApi}
                  className="!flex !items-center !gap-2 !text-emerald-700 !border-emerald-300 hover:!border-emerald-500"
                >
                  Download Sample Template (.xlsx)
                </Button>
              </div>
            </div>
          )}

          {/* ════ STEP 1: Column Mapping ════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  We've auto-detected <strong>{Object.keys(columnMapping).length}</strong> column(s). 
                  Review and adjust the mappings. Set "Ignore this column" for columns you don't need.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <span>Your File's Column</span>
                  <span>Maps To Field</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {rawHeaders.map((header) => {
                    const mapped = columnMapping[header];
                    const isAutoMapped = !!autoMap(header);
                    return (
                      <div key={header} className="grid grid-cols-2 px-4 py-2.5 items-center hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          {mapped && mapped !== '__ignore__'
                            ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            : <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                          }
                          <span className="text-sm text-slate-700 font-mono truncate">{header}</span>
                          {isAutoMapped && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 rounded-full">auto</span>}
                        </div>
                        <Select
                          size="small"
                          value={mapped || '__ignore__'}
                          onChange={(val) => setColumnMapping(prev => ({ ...prev, [header]: val }))}
                          className="w-full"
                          showSearch
                        >
                          <Option value="__ignore__"><span className="text-slate-400">— Ignore this column —</span></Option>
                          {PRODUCT_FIELDS.map(f => (
                            <Option key={f.key} value={f.key}>
                              {f.label}
                            </Option>
                          ))}
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-slate-400">
                * Fields marked with asterisk are required. You can proceed without mapping them but will see warnings.
              </p>
            </div>
          )}

          {/* ════ STEP 2: Review Products ════ */}
          {step === 2 && summary && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Found', val: summary.total, color: 'bg-slate-50 border-slate-200 text-slate-700' },
                  { label: 'Ready to Upload', val: summary.ready, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { label: 'Need Review', val: summary.incomplete, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { label: 'Invalid / Skip', val: summary.invalid, color: 'bg-red-50 border-red-200 text-red-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                    <p className="text-2xl font-bold">{s.val}</p>
                    <p className="text-xs mt-0.5 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2">
                {['all', 'ready', 'incomplete', 'invalid'].map(f => (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      reviewFilter === f
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'ready' ? 'Ready' : f === 'incomplete' ? 'Needs Review' : 'Invalid'}
                    {' '}({f === 'all' ? summary.total : f === 'ready' ? summary.ready : f === 'incomplete' ? summary.incomplete : summary.invalid})
                  </button>
                ))}
              </div>

              {/* Products table */}
              <Table
                dataSource={filteredProducts}
                columns={reviewColumns}
                rowKey="_rowIndex"
                size="small"
                pagination={{ pageSize: 10, showTotal: (t) => `${t} products` }}
                scroll={{ x: 900 }}
                rowClassName={(r) => r._status === 'invalid' ? 'bg-red-50/30' : r._status === 'incomplete' ? 'bg-amber-50/20' : ''}
              />

              {summary.incomplete > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message={`${summary.incomplete} products need review before uploading.`}
                  description="Click 'Review All & Upload' to go through each incomplete product one by one."
                />
              )}
            </div>
          )}

          {/* ════ STEP 2 (Review Flow): Per-product review modal ════ */}
          {step === 2 && reviewQueue.length > 0 && reviewIndex < reviewQueue.length && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-medium">
                      Reviewing {reviewIndex + 1} of {reviewQueue.length} incomplete products
                    </span>
                    <StatusBadge status="incomplete" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mt-1">Incomplete Product Data</h3>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5 truncate">
                    {currentReviewProduct?.masterName}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="px-5 pt-3">
                  <Progress percent={Math.round(((reviewIndex) / reviewQueue.length) * 100)} size="small" strokeColor="#10b981" />
                </div>

                {/* Missing fields */}
                <div className="p-5 space-y-3">
                  <p className="text-sm text-slate-600 font-medium">This product is missing some information:</p>
                  <div className="space-y-2">
                    {currentReviewProduct?._missingFields?.map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span className="capitalize">{f.replace(/_/g, ' ')} is missing</span>
                      </div>
                    ))}
                    {currentReviewProduct?._validationErrors?.map(e => (
                      <div key={e} className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                        <XCircle size={14} className="shrink-0" />
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>

                  {/* Available data preview */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1 mt-2">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Available data:</p>
                    {['mrp', 'brand', 'category', 'totalStock'].map(f => currentReviewProduct?.[f] ? (
                      <div key={f} className="flex justify-between text-xs">
                        <span className="text-slate-500 capitalize">{f.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-slate-700">{currentReviewProduct[f]}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                  <Button onClick={() => handleReviewDecision('skip')} className="!flex !items-center !justify-center !gap-1">
                    <SkipForward size={14} /> Skip This
                  </Button>
                  <Button onClick={() => handleReviewDecision('upload_as_is')} className="!flex !items-center !justify-center !gap-1">
                    <CloudUpload size={14} /> Upload As Is
                  </Button>
                  <Button type="primary" onClick={() => { openEditForm(currentReviewProduct); }} className="!flex !items-center !justify-center !gap-1 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600">
                    <Edit3 size={14} /> Fill Missing Info
                  </Button>
                  <Button danger onClick={handleSkipAll} className="!flex !items-center !justify-center !gap-1 !border-red-200 hover:!bg-red-50 text-red-600">
                    <FastForward size={14} /> Skip All (Upload)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ════ STEP 3: Upload Progress ════ */}
          {step === 3 && (
            <div className="space-y-5">
              {uploading ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <Spin size="large" />
                    <p className="text-slate-600 font-medium mt-3">Uploading products...</p>
                    <p className="text-slate-400 text-sm">{uploadProgress}% complete</p>
                  </div>
                  <Progress percent={uploadProgress} strokeColor={{ '0%': '#10b981', '100%': '#059669' }} />
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <div className="bg-slate-800 px-4 py-2 text-xs text-slate-300 font-mono">Upload Log</div>
                    <div className="divide-y divide-slate-100">
                      {uploadLog.map((l, i) => (
                        <div key={i} className={`flex items-center gap-2 px-4 py-2 text-xs ${logColors[l.status] || 'text-slate-600'}`}>
                          {l.status === 'success' && <CheckCircle2 size={12} />}
                          {l.status === 'incomplete' && <AlertTriangle size={12} />}
                          {l.status === 'failed' && <XCircle size={12} />}
                          {l.status === 'duplicate' && <AlertTriangle size={12} />}
                          {l.status === 'skipped' && <SkipForward size={12} />}
                          <span className="truncate flex-1">{l.name}</span>
                          <span className="text-slate-400">{l.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : uploadResults ? (
                <div className="space-y-5">
                  {/* Success header */}
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Import Complete!</h3>
                    <p className="text-slate-500 text-sm mt-1">Batch ID: <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{uploadResults.batchId}</span></p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Uploaded', val: uploadResults.uploaded, color: 'emerald' },
                      { label: 'With Missing Data', val: uploadResults.incomplete, color: 'amber' },
                      { label: 'Skipped', val: uploadResults.skipped, color: 'slate' },
                      { label: 'Failed', val: uploadResults.failed, color: 'red' },
                    ].map(s => (
                      <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-xl p-3 text-center`}>
                        <p className={`text-2xl font-bold text-${s.color}-700`}>{s.val}</p>
                        <p className={`text-xs font-medium text-${s.color}-600 mt-0.5`}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Upload log */}
                  {uploadLog.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <div className="bg-slate-800 px-4 py-2 text-xs text-slate-300 font-mono">Full Log</div>
                      <div className="divide-y divide-slate-100">
                        {uploadLog.map((l, i) => (
                          <div key={i} className={`flex items-center gap-2 px-4 py-1.5 text-xs ${logColors[l.status] || 'text-slate-600'}`}>
                            {l.status === 'success' && <CheckCircle2 size={11} />}
                            {l.status === 'incomplete' && <AlertTriangle size={11} />}
                            {l.status === 'failed' && <XCircle size={11} />}
                            {l.status === 'duplicate' && <AlertTriangle size={11} />}
                            <span className="truncate flex-1">{l.name}</span>
                            <span className="text-slate-400">{l.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Footer Buttons ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between flex-wrap gap-3">
          {/* Left: Back */}
          <div>
            {step > 0 && step < 3 && !uploading && (
              <Button icon={<ChevronLeft size={15} />} onClick={() => setStep(s => s - 1)}>Back</Button>
            )}
          </div>

          {/* Right: Primary action */}
          <div className="flex gap-3">
            {step === 0 && file && rawRows.length > 0 && (
              <Button type="primary" icon={<ChevronRight size={15} />}
                onClick={() => setStep(1)}
                className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 !flex !items-center !gap-1"
              >
                Continue to Column Mapping
              </Button>
            )}
            {step === 1 && (
              <Button type="primary" loading={validating}
                icon={<ChevronRight size={15} />}
                onClick={handleToReview}
                className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 !flex !items-center !gap-1"
              >
                Continue to Review
              </Button>
            )}
            {step === 2 && summary && !reviewQueue.length && (
              <div className="flex gap-2">
                {summary.ready > 0 && (
                  <Button
                    onClick={() => startReview('ready_only')}
                    className="!flex !items-center !gap-1"
                  >
                    <CloudUpload size={14} /> Upload {summary.ready} Ready Products
                  </Button>
                )}
                {summary.incomplete > 0 && (
                  <Button type="primary"
                    onClick={() => startReview('all')}
                    className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 !flex !items-center !gap-1"
                  >
                    <Eye size={14} /> Review All & Upload
                  </Button>
                )}
                {summary.incomplete === 0 && summary.ready > 0 && (
                  <Button type="primary"
                    onClick={() => handleUpload(validatedProducts.filter(p => p._status === 'ready'), {})}
                    className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 !flex !items-center !gap-1"
                  >
                    <CloudUpload size={14} /> Upload All {summary.ready} Products
                  </Button>
                )}
              </div>
            )}
            {step === 3 && !uploading && uploadResults && (
              <div className="flex gap-2">
                <Button icon={<Download size={14} />} onClick={downloadReport}>Download Report</Button>
                <Button type="primary"
                  onClick={() => { resetAll(); onClose(); onImportComplete?.(); }}
                  className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 !flex !items-center !gap-1"
                >
                  <CheckCircle2 size={14} /> View Products
                </Button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Edit Product Modal ── */}
      <Modal
        open={showEditModal}
        title={<span className="text-base font-bold">Fill Missing Info — {editingProduct?.masterName}</span>}
        onCancel={() => setShowEditModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowEditModal(false)}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleEditSave}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600">
            Save & Continue
          </Button>
        ]}
        width={540}
        centered
        maskClosable={false}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Collapse defaultActiveKey={['basic', 'pricing', 'stock']} size="small">
            <Panel header="Basic Info" key="basic">
              <Form.Item label="Product Name *" name="masterName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <div className="grid grid-cols-2 gap-3">
                <Form.Item label="Brand" name="brand"><Input /></Form.Item>
                <Form.Item label="Category" name="category"><Input /></Form.Item>
              </div>
            </Panel>
            <Panel header="Pricing" key="pricing">
              <div className="grid grid-cols-2 gap-3">
                <Form.Item label="MRP (₹)" name="mrp"><InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
                <Form.Item label="Cost Price (₹)" name="costPrice"><InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
                <Form.Item label="Fifozone Selling Price" name="sellingPrice_fifozone"><InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
              </div>
            </Panel>
            <Panel header="Stock" key="stock">
              <Form.Item label="Total Stock" name="totalStock"><InputNumber className="w-full" min={0} /></Form.Item>
            </Panel>
          </Collapse>
        </Form>
      </Modal>

      {/* ── Close confirmation ── */}
      <Modal
        open={closingConfirm}
        onCancel={() => setClosingConfirm(false)}
        onOk={() => { setClosingConfirm(false); resetAll(); onClose(); }}
        okText="Cancel Import"
        cancelText="Continue Importing"
        okButtonProps={{ danger: true }}
        centered
        title="Cancel Import?"
      >
        <p className="text-slate-600">Are you sure you want to cancel the import? No products have been saved yet.</p>
      </Modal>
    </>
  );
};

export default ImportWizard;
