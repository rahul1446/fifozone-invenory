import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select, InputNumber,
  DatePicker, message, Tooltip, Popconfirm, Badge, Row, Col,
  Divider, Empty, Tabs, Switch
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PauseCircleOutlined,
  PlayCircleOutlined, TagsOutlined, SearchOutlined, GiftOutlined, PercentageOutlined
} from '@ant-design/icons';
import { Tag as TagIcon, Layers, Package, ShoppingBag } from 'lucide-react';
import dayjs from 'dayjs';
import {
  getPromotionsApi, getDiscountMetaApi,
  createDiscountApi, createCouponApi,
  updatePromotionApi, pausePromotionApi, resumePromotionApi, deletePromotionApi
} from '../../api/promotionApi';
import { getProductsApi } from '../../api/productApi';

const { Option } = Select;
const { RangePicker } = DatePicker;

const TARGET_TYPES = [
  { value: 'product',     label: 'Specific Product(s)', icon: <Package size={14} />,     color: 'blue' },
  { value: 'brand',       label: 'Brand',               icon: <TagIcon size={14} />,     color: 'purple' },
  { value: 'category',    label: 'Category',            icon: <Layers size={14} />,      color: 'orange' },
  { value: 'subcategory', label: 'Sub-Category',        icon: <ShoppingBag size={14} />, color: 'cyan' },
  { value: 'all',         label: 'All Products',        icon: <ShoppingBag size={14} />, color: 'green' },
];

const STATUS_BADGE = {
  active:    'success',
  scheduled: 'processing',
  paused:    'warning',
  expired:   'default'
};

// ─────────────────────────────────────────────────────────────
// Reusable action buttons for both tabs
// ─────────────────────────────────────────────────────────────
const ActionButtons = ({ record, onEdit, onPause, onResume, onDelete }) => (
  <Space>
    <Tooltip title="Edit">
      <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
    </Tooltip>
    {(record.status === 'active' || record.status === 'scheduled') && (
      <Tooltip title="Pause">
        <Button size="small" type="text" icon={<PauseCircleOutlined className="text-orange-500" />} onClick={() => onPause(record._id)} />
      </Tooltip>
    )}
    {record.status === 'paused' && (
      <Tooltip title="Resume">
        <Button size="small" type="text" icon={<PlayCircleOutlined className="text-green-500" />} onClick={() => onResume(record._id)} />
      </Tooltip>
    )}
    <Popconfirm title="Delete this?" onConfirm={() => onDelete(record._id)} okText="Yes" cancelText="No" okType="danger">
      <Tooltip title="Delete">
        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
      </Tooltip>
    </Popconfirm>
  </Space>
);

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
const DiscountsPage = () => {
  const [allData,  setAllData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [meta,     setMeta]     = useState({ brands: [], categories: [], subcategories: [] });
  const [products, setProducts] = useState([]);
  const [search,   setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('discounts');

  // Modal
  const [modalOpen,      setModalOpen]      = useState(false);
  const [modalType,      setModalType]      = useState('discount'); // 'discount' | 'coupon'
  const [editingRecord,  setEditingRecord]  = useState(null);
  const [saving,         setSaving]         = useState(false);

  const [form] = Form.useForm();
  const targetType  = Form.useWatch('targetType', form);
  const discountType = Form.useWatch('discountType', form);

  // ── Fetch ──
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dataRes, metaRes, prodRes] = await Promise.all([
        getPromotionsApi(),
        getDiscountMetaApi(),
        getProductsApi({ limit: 2000 }),
      ]);
      setAllData(dataRes?.data?.data || []);
      setMeta(metaRes?.data?.data || { brands: [], categories: [], subcategories: [] });
      const pd = prodRes?.data?.products || prodRes?.data || [];
      setProducts(Array.isArray(pd) ? pd : []);
    } catch { message.error('Failed to load data'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const discounts = useMemo(() => allData.filter(d => d.type !== 'coupon'), [allData]);
  const coupons   = useMemo(() => allData.filter(d => d.type === 'coupon'),  [allData]);

  const filtered = (list) => list.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) &&
        !(d.couponCode || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Stats ──
  const stats = (list) => ({
    active:    list.filter(d => d.status === 'active').length,
    scheduled: list.filter(d => d.status === 'scheduled').length,
    paused:    list.filter(d => d.status === 'paused').length,
    expired:   list.filter(d => d.status === 'expired').length,
  });

  // ── Modal ──
  const openCreate = (type) => {
    setEditingRecord(null);
    setModalType(type);
    form.resetFields();
    form.setFieldsValue({
      targetType: 'all', discountType: 'percentage',
      platforms: ['fifozone'], perCustomerLimit: 1
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setModalType(record.type === 'coupon' ? 'coupon' : 'discount');
    form.setFieldsValue({
      ...record,
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
      productIds:    (record.applicableProducts || []).map(p => p._id || p),
      brands:        record.applicableBrands       || [],
      categories:    record.applicableCategories   || [],
      subcategories: record.applicableSubcategories|| [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      const [startDate, endDate] = vals.dateRange;
      setSaving(true);

      let payload;
      if (modalType === 'coupon') {
        payload = {
          name: vals.name, description: vals.description,
          couponCode: vals.couponCode,
          platforms: vals.platforms || ['fifozone'],
          discountType: vals.discountType, discountValue: vals.discountValue,
          maximumDiscountAmount: vals.maximumDiscountAmount,
          minimumOrderAmount: vals.minimumOrderAmount || 0,
          usageLimit: vals.usageLimit || null,
          perCustomerLimit: vals.perCustomerLimit || 1,
          startDate: startDate.toISOString(), endDate: endDate.toISOString(),
        };
      } else {
        payload = {
          name: vals.name, description: vals.description,
          platforms: vals.platforms || ['fifozone'],
          discountType: vals.discountType, discountValue: vals.discountValue,
          maximumDiscountAmount: vals.maximumDiscountAmount,
          targetType: vals.targetType,
          productIds:    vals.productIds    || [],
          brands:        vals.brands        || [],
          categories:    vals.categories    || [],
          subcategories: vals.subcategories || [],
          startDate: startDate.toISOString(), endDate: endDate.toISOString(),
        };
      }

      if (editingRecord) {
        await updatePromotionApi(editingRecord._id, payload);
        message.success('Updated!');
      } else {
        if (modalType === 'coupon') await createCouponApi(payload);
        else                        await createDiscountApi(payload);
        message.success(`${modalType === 'coupon' ? 'Coupon' : 'Discount'} created!`);
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
    } finally { setSaving(false); }
  };

  const handlePause  = async (id) => { try { await pausePromotionApi(id);  message.success('Paused');  fetchAll(); } catch { message.error('Failed'); }};
  const handleResume = async (id) => { try { await resumePromotionApi(id); message.success('Resumed'); fetchAll(); } catch (e) { message.error(e?.response?.data?.message || 'Failed'); }};
  const handleDelete = async (id) => { try { await deletePromotionApi(id); message.success('Deleted'); fetchAll(); } catch { message.error('Failed'); }};

  // ── Shared columns (value, schedule, status, actions) ──
  const sharedCols = [
    {
      title: 'Value', key: 'value',
      render: (_, r) => (
        <span className="font-bold text-emerald-600 text-base">
          {r.discountType === 'percentage' ? `${r.discountValue}%` : `₹${r.discountValue}`}
          {r.maximumDiscountAmount
            ? <span className="text-xs text-slate-400 font-normal ml-1">(max ₹{r.maximumDiscountAmount})</span>
            : null}
        </span>
      )
    },
    {
      title: 'Platforms', dataIndex: 'platforms', key: 'platforms',
      render: (v) => (v || []).map(p => <Tag key={p} className="capitalize">{p}</Tag>)
    },
    {
      title: 'Schedule', key: 'schedule',
      render: (_, r) => (
        <div className="text-xs text-slate-600">
          <div>{dayjs(r.startDate).format('DD MMM YYYY')}</div>
          <div className="text-slate-400">→ {dayjs(r.endDate).format('DD MMM YYYY')}</div>
        </div>
      )
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: v => <Badge status={STATUS_BADGE[v] || 'default'} text={<span className="capitalize font-medium">{v}</span>} />
    },
  ];

  // ── Discount-specific columns ──
  const discountColumns = [
    {
      title: 'Discount Name', dataIndex: 'name', key: 'name',
      render: (v, r) => (
        <div>
          <div className="font-semibold text-slate-800">{v}</div>
          {r.description && <div className="text-xs text-slate-400">{r.description}</div>}
        </div>
      )
    },
    {
      title: 'Applies To', key: 'target',
      render: (_, r) => {
        const t = TARGET_TYPES.find(x => x.value === r.targetType);
        let detail = '';
        if (r.targetType === 'product')     detail = `${(r.applicableProducts || []).length} product(s)`;
        if (r.targetType === 'brand')       detail = (r.applicableBrands || []).slice(0,3).join(', ');
        if (r.targetType === 'category')    detail = (r.applicableCategories || []).slice(0,3).join(', ');
        if (r.targetType === 'subcategory') detail = (r.applicableSubcategories || []).slice(0,3).join(', ');
        if (r.targetType === 'all')         detail = 'All Products';
        return (
          <div>
            <Tag color={t?.color}>{t?.label}</Tag>
            <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[160px]">{detail}</div>
          </div>
        );
      }
    },
    ...sharedCols,
    {
      title: 'Actions', key: 'actions', align: 'right',
      render: (_, r) => <ActionButtons record={r} onEdit={openEdit} onPause={handlePause} onResume={handleResume} onDelete={handleDelete} />
    }
  ];

  // ── Coupon-specific columns ──
  const couponColumns = [
    {
      title: 'Coupon Name', key: 'name',
      render: (_, r) => (
        <div>
          <div className="font-semibold text-slate-800">{r.name}</div>
          {r.description && <div className="text-xs text-slate-400">{r.description}</div>}
        </div>
      )
    },
    {
      title: 'Code', dataIndex: 'couponCode', key: 'couponCode',
      render: v => (
        <Tag color="geekblue" className="font-mono font-bold text-sm px-3 py-1 tracking-widest">{v}</Tag>
      )
    },
    ...sharedCols,
    {
      title: 'Usage', key: 'usage',
      render: (_, r) => (
        <div className="text-sm text-slate-600">
          <span className="font-semibold">{r.usageCount || 0}</span>
          {r.usageLimit ? ` / ${r.usageLimit}` : ' / ∞'}
          <div className="text-xs text-slate-400">Min order: ₹{r.minimumOrderAmount || 0}</div>
        </div>
      )
    },
    {
      title: 'Actions', key: 'actions', align: 'right',
      render: (_, r) => <ActionButtons record={r} onEdit={openEdit} onPause={handlePause} onResume={handleResume} onDelete={handleDelete} />
    }
  ];

  // ── Stat cards ──
  const StatCards = ({ list }) => {
    const s = stats(list);
    return (
      <Row gutter={12} className="mb-5">
        {[
          { label: 'Active',    count: s.active,    bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600' },
          { label: 'Scheduled', count: s.scheduled, bg: 'bg-blue-50 border-blue-100',       text: 'text-blue-600' },
          { label: 'Paused',    count: s.paused,    bg: 'bg-orange-50 border-orange-100',   text: 'text-orange-600' },
          { label: 'Expired',   count: s.expired,   bg: 'bg-slate-50 border-slate-100',     text: 'text-slate-500' },
        ].map(s => (
          <Col xs={12} md={6} key={s.label}>
            <div className={`rounded-2xl border p-4 ${s.bg}`}>
              <div className={`text-3xl font-black ${s.text}`}>{s.count}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          </Col>
        ))}
      </Row>
    );
  };

  // ── Filters bar ──
  const FiltersBar = ({ count, extra }) => (
    <div className="p-5 border-b border-slate-100 flex flex-wrap items-center gap-3">
      <Input
        prefix={<SearchOutlined className="text-slate-400" />}
        placeholder="Search by name or code..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear style={{ width: 220 }}
      />
      <Select placeholder="Filter by status" allowClear value={filterStatus || undefined}
        onChange={v => setFilterStatus(v || '')} style={{ width: 150 }}>
        <Option value="active">Active</Option>
        <Option value="scheduled">Scheduled</Option>
        <Option value="paused">Paused</Option>
        <Option value="expired">Expired</Option>
      </Select>
      {extra}
      <div className="ml-auto text-sm text-slate-400">{count} record(s)</div>
    </div>
  );

  return (
    <div className="space-y-5 pb-10 max-w-[1400px] mx-auto p-1">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 rounded-xl">
            <TagsOutlined className="text-rose-500 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Discounts & Coupons</h1>
            <p className="text-sm text-slate-500">Manage product discounts and customer coupon codes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<GiftOutlined />} size="large" onClick={() => { setActiveTab('coupons'); openCreate('coupon'); }}
            className="font-semibold rounded-xl border-indigo-500 text-indigo-600 hover:bg-indigo-50">
            New Coupon
          </Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => { setActiveTab('discounts'); openCreate('discount'); }}
            className="!bg-rose-500 !border-rose-500 hover:!bg-rose-600 font-semibold rounded-xl">
            New Discount
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: 'discounts',
            label: <span className="font-semibold flex items-center gap-2"><PercentageOutlined /> Product Discounts <Tag>{discounts.length}</Tag></span>,
            children: (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <StatCards list={discounts} />
                <FiltersBar count={filtered(discounts).length} />
                <Table
                  dataSource={filtered(discounts)}
                  columns={discountColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 12, showTotal: t => `${t} discounts` }}
                  locale={{ emptyText: <Empty description="No discounts yet. Click 'New Discount' to add one." /> }}
                />
              </div>
            )
          },
          {
            key: 'coupons',
            label: <span className="font-semibold flex items-center gap-2"><GiftOutlined /> Coupon Codes <Tag color="blue">{coupons.length}</Tag></span>,
            children: (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <StatCards list={coupons} />
                <FiltersBar count={filtered(coupons).length} />
                <Table
                  dataSource={filtered(coupons)}
                  columns={couponColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 12, showTotal: t => `${t} coupons` }}
                  locale={{ emptyText: <Empty description="No coupons yet. Click 'New Coupon' to add one." /> }}
                />
              </div>
            )
          }
        ]}
      />

      {/* ─── Create / Edit Modal ─── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            {modalType === 'coupon' ? <GiftOutlined className="text-indigo-500" /> : <TagsOutlined className="text-rose-500" />}
            <span className="font-bold">
              {editingRecord
                ? `Edit ${modalType === 'coupon' ? 'Coupon' : 'Discount'}`
                : `Create ${modalType === 'coupon' ? 'Coupon Code' : 'Discount'}`}
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}
            className={modalType === 'coupon' ? '!bg-indigo-500 !border-indigo-500' : '!bg-rose-500 !border-rose-500'}>
            {editingRecord ? 'Update' : 'Create'}
          </Button>
        ]}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label={modalType === 'coupon' ? 'Coupon Name' : 'Discount Name'}
                rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder={modalType === 'coupon' ? 'e.g. Summer Sale Coupon' : 'e.g. Diwali 15% Off'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="platforms" label="Platforms" rules={[{ required: true }]}>
                <Select mode="multiple" placeholder="Select platforms">
                  <Option value="fifozone">Fifozone</Option>
                  <Option value="amazon">Amazon</Option>
                  <Option value="flipkart">Flipkart</Option>
                  <Option value="meesho">Meesho</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} placeholder="Short note about this discount or coupon" />
          </Form.Item>

          {/* Coupon Code field — only for coupons */}
          {modalType === 'coupon' && (
            <Form.Item name="couponCode" label="Coupon Code"
              rules={[{ required: true, message: 'Required' }, { pattern: /^[A-Z0-9_-]+$/i, message: 'Letters, numbers, - and _ only' }]}
              extra="Customers will type this code at checkout. Auto-uppercased.">
              <Input
                placeholder="e.g. SAVE20, DIWALI15, WELCOME10"
                className="font-mono font-bold tracking-widest"
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Item>
          )}

          <Divider orientation="left" className="!text-sm !text-slate-500">Discount Value</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="discountType" label="Type" rules={[{ required: true }]}>
                <Select>
                  <Option value="percentage">Percentage (%)</Option>
                  <Option value="flat">Flat Amount (₹)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="discountValue" label="Value" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
                <InputNumber className="w-full" min={0.01}
                  placeholder={discountType === 'flat' ? '₹100' : '15'}
                  addonBefore={discountType === 'flat' ? '₹' : '%'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maximumDiscountAmount" label="Max Discount Cap (₹)">
                <InputNumber className="w-full" min={0} placeholder="Optional" addonBefore="₹" />
              </Form.Item>
            </Col>
          </Row>

          {/* Coupon-specific rules */}
          {modalType === 'coupon' && (
            <>
              <Divider orientation="left" className="!text-sm !text-slate-500">Coupon Rules</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="minimumOrderAmount" label="Min Order (₹)">
                    <InputNumber className="w-full" min={0} placeholder="0 = no minimum" addonBefore="₹" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="usageLimit" label="Total Usage Limit">
                    <InputNumber className="w-full" min={1} placeholder="Blank = unlimited" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="perCustomerLimit" label="Per Customer Limit">
                    <InputNumber className="w-full" min={1} placeholder="1" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Discount target — only for product discounts */}
          {modalType === 'discount' && (
            <>
              <Divider orientation="left" className="!text-sm !text-slate-500">Applies To</Divider>
              <Form.Item name="targetType" label="Apply Discount To" rules={[{ required: true }]}>
                <Select placeholder="Choose target">
                  {TARGET_TYPES.map(t => (
                    <Option key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {targetType === 'product' && (
                <Form.Item name="productIds" label="Select Products" rules={[{ required: true }]}>
                  <Select mode="multiple" showSearch placeholder="Search products..."
                    filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}>
                    {products.map(p => <Option key={p._id} value={p._id}>{p.masterName}</Option>)}
                  </Select>
                </Form.Item>
              )}
              {targetType === 'brand' && (
                <Form.Item name="brands" label="Select Brands" rules={[{ required: true }]}>
                  <Select mode="multiple" showSearch placeholder="Select brands...">
                    {meta.brands.map(b => <Option key={b} value={b}>{b}</Option>)}
                  </Select>
                </Form.Item>
              )}
              {targetType === 'category' && (
                <Form.Item name="categories" label="Select Categories" rules={[{ required: true }]}>
                  <Select mode="multiple" showSearch placeholder="Select categories...">
                    {meta.categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              )}
              {targetType === 'subcategory' && (
                <Form.Item name="subcategories" label="Select Sub-Categories" rules={[{ required: true }]}>
                  <Select mode="multiple" showSearch placeholder="Select sub-categories...">
                    {meta.subcategories.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Form.Item>
              )}
              {targetType === 'all' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-700">
                  ✅ This discount will apply to <strong>all active products</strong>.
                </div>
              )}
            </>
          )}

          <Divider orientation="left" className="!text-sm !text-slate-500">Schedule</Divider>
          <Form.Item name="dateRange" label="Start & End Date" rules={[{ required: true }]}>
            <RangePicker className="w-full" format="DD-MM-YYYY"
              disabledDate={d => !editingRecord && d && d < dayjs().startOf('day')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DiscountsPage;
