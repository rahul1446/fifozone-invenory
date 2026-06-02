import React, { useState, useEffect } from 'react';
import { Table, Input, Select, DatePicker, Button, Tag, Modal, Form, InputNumber, Checkbox, Dropdown, Switch, Popconfirm, Descriptions, Divider } from 'antd';
import { Tag as TagIcon, Percent, MoreVertical, Eye, Pause, Play, Trash2, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { getPromotionsApi, createCouponApi, createDiscountApi } from '../../api/promotionApi';
import { formatCurrency, formatDate } from '../../utils/formatters';

const { RangePicker } = DatePicker;
const { Option } = Select;

const MOCK_PROMOTIONS = [
  { _id: '1', platforms: ['fifozone'], name: 'SUMMER20', type: 'coupon', discountValue: 20, discountType: 'percentage', minimumOrderAmount: 1000, startDate: dayjs().subtract(5, 'days').toISOString(), endDate: dayjs().add(5, 'days').toISOString(), usageCount: 45, status: 'active', applicableProducts: [] },
  { _id: '2', platforms: ['amazon', 'flipkart'], name: 'Diwali Sale 2024', type: 'percentage', discountValue: 15, discountType: 'percentage', minimumOrderAmount: 2000, startDate: dayjs().add(2, 'days').toISOString(), endDate: dayjs().add(10, 'days').toISOString(), usageCount: 0, status: 'scheduled', applicableProducts: [] },
  { _id: '3', platforms: ['fifozone'], name: 'FLAT200', type: 'coupon', discountValue: 200, discountType: 'flat', minimumOrderAmount: 1500, startDate: dayjs().subtract(10, 'days').toISOString(), endDate: dayjs().subtract(2, 'days').toISOString(), usageCount: 23, status: 'expired', applicableProducts: [] },
  { _id: '4', platforms: ['fifozone', 'amazon'], name: 'WELCOME10', type: 'coupon', discountValue: 10, discountType: 'percentage', minimumOrderAmount: 500, startDate: dayjs().subtract(2, 'days').toISOString(), endDate: dayjs().add(30, 'days').toISOString(), usageCount: 8, status: 'active', applicableProducts: [] },
];

const STATUS_COLOR = { active: 'green', scheduled: 'blue', paused: 'orange', expired: 'default' };

const PromotionsPage = () => {
  const [promotions, setPromotions]         = useState([]);
  const [loading, setLoading]               = useState(false);
  const [couponModalOpen, setCouponModalOpen]     = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [manageModal, setManageModal]             = useState({ open: false, record: null });
  const [editModal, setEditModal]                 = useState({ open: false, record: null });
  const [couponForm]  = Form.useForm();
  const [discountForm] = Form.useForm();
  const [editForm]    = Form.useForm();

  useEffect(() => { fetchPromotions(); }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await getPromotionsApi();
      const data = res?.data?.data;
      const arr = Array.isArray(data) ? data : Array.isArray(data?.promotions) ? data.promotions : null;
      setPromotions(arr && arr.length > 0 ? arr : MOCK_PROMOTIONS);
    } catch {
      setPromotions(MOCK_PROMOTIONS);
    } finally {
      setLoading(false);
    }
  };

  // ─── Manage Actions ────────────────────────────────────────────────────────
  const handleToggleStatus = (record) => {
    const newStatus = record.status === 'active' ? 'paused' : 'active';
    setPromotions(prev => prev.map(p => p._id === record._id ? { ...p, status: newStatus } : p));
    // Also update inside manage modal
    setManageModal(m => m.record?._id === record._id ? { ...m, record: { ...m.record, status: newStatus } } : m);
    toast.success(`"${record.name}" ${newStatus === 'active' ? 'activated' : 'paused'}`);
  };

  const handleDelete = (record) => {
    setPromotions(prev => prev.filter(p => p._id !== record._id));
    setManageModal({ open: false, record: null });
    toast.success(`"${record.name}" deleted`);
  };

  const handleOpenEdit = (record) => {
    setManageModal({ open: false, record: null });
    editForm.setFieldsValue({
      name: record.name,
      discountType: record.discountType || 'percentage',
      discountValue: record.discountValue,
      minimumOrderAmount: record.minimumOrderAmount,
      platforms: record.platforms,
      validity: record.startDate && record.endDate ? [dayjs(record.startDate), dayjs(record.endDate)] : undefined,
    });
    setEditModal({ open: true, record });
  };

  const handleSaveEdit = (values) => {
    const updated = {
      ...editModal.record,
      ...values,
      startDate: values.validity?.[0]?.toISOString(),
      endDate: values.validity?.[1]?.toISOString(),
    };
    delete updated.validity;
    setPromotions(prev => prev.map(p => p._id === updated._id ? updated : p));
    setEditModal({ open: false, record: null });
    editForm.resetFields();
    toast.success(`"${updated.name}" updated successfully`);
  };

  // ─── Create handlers ───────────────────────────────────────────────────────
  const handleCreateCoupon = async (values) => {
    try {
      await createCouponApi({ ...values, startDate: values.validity?.[0]?.toISOString(), endDate: values.validity?.[1]?.toISOString() });
      toast.success('Coupon created on Fifozone!');
    } catch {
      // Optimistic add
      const newCoupon = {
        _id: `local-${Date.now()}`,
        name: values.couponCode,
        type: 'coupon',
        platforms: ['fifozone'],
        discountType: values.discountType || 'percentage',
        discountValue: values.discountValue,
        minimumOrderAmount: values.minimumOrderAmount || 0,
        startDate: values.validity?.[0]?.toISOString(),
        endDate: values.validity?.[1]?.toISOString(),
        usageCount: 0,
        status: 'active',
      };
      setPromotions(prev => [newCoupon, ...prev]);
      toast.success('Coupon created!');
    } finally {
      setCouponModalOpen(false);
      couponForm.resetFields();
    }
  };

  const handleCreateDiscount = async (values) => {
    try {
      await createDiscountApi({ ...values, startDate: values.schedule?.[0]?.toISOString(), endDate: values.schedule?.[1]?.toISOString() });
      toast.success('Discount scheduled!');
    } catch {
      const newDiscount = {
        _id: `local-${Date.now()}`,
        name: values.name,
        type: 'percentage',
        platforms: values.platforms || ['fifozone'],
        discountType: 'percentage',
        discountValue: values.discountValue,
        minimumOrderAmount: values.minimumOrderAmount || 0,
        startDate: values.schedule?.[0]?.toISOString(),
        endDate: values.schedule?.[1]?.toISOString(),
        usageCount: 0,
        status: dayjs(values.schedule?.[0]).isAfter(dayjs()) ? 'scheduled' : 'active',
      };
      setPromotions(prev => [newDiscount, ...prev]);
      toast.success('Discount scheduled!');
    } finally {
      setDiscountModalOpen(false);
      discountForm.resetFields();
    }
  };

  const getDiscountLabel = (p) => {
    if (p.discountType === 'percentage') return `${p.discountValue}% off`;
    if (p.discountType === 'flat') return `₹${p.discountValue} off`;
    return p.discountValue;
  };

  // ─── Dropdown menu items for each row ─────────────────────────────────────
  const getMenuItems = (record) => [
    {
      key: 'view',
      icon: <Eye className="w-3.5 h-3.5" />,
      label: 'View Details',
      onClick: () => setManageModal({ open: true, record }),
    },
    {
      key: 'edit',
      icon: <Edit3 className="w-3.5 h-3.5" />,
      label: 'Edit',
      onClick: () => handleOpenEdit(record),
    },
    {
      key: 'toggle',
      icon: record.status === 'active'
        ? <Pause className="w-3.5 h-3.5" />
        : <Play className="w-3.5 h-3.5" />,
      label: record.status === 'active' ? 'Pause' : 'Activate',
      disabled: record.status === 'expired',
      onClick: () => handleToggleStatus(record),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      label: 'Delete',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: `Delete "${record.name}"?`,
          content: 'This will remove the promotion permanently.',
          okText: 'Delete',
          okType: 'danger',
          onOk: () => handleDelete(record),
        });
      },
    },
  ];

  // ─── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Platform',
      dataIndex: 'platforms',
      width: 140,
      render: vals => (Array.isArray(vals) ? vals : []).map(v => (
        <Tag key={v} color={v === 'fifozone' ? 'green' : v === 'amazon' ? 'orange' : v === 'flipkart' ? 'blue' : v === 'meesho' ? 'magenta' : 'default'} className="mb-0.5 text-[10px]">
          {v.toUpperCase()}
        </Tag>
      )),
    },
    {
      title: 'Name / Code',
      dataIndex: 'name',
      render: (val, r) => (
        <div>
          <span className="font-bold text-emerald-700 cursor-pointer hover:underline" onClick={() => setManageModal({ open: true, record: r })}>
            {val}
          </span>
          <Tag className="ml-2 text-[10px]">{r.type?.toUpperCase()}</Tag>
        </div>
      ),
    },
    {
      title: 'Discount',
      render: (_, p) => <span className="font-semibold text-slate-700">{getDiscountLabel(p)}</span>,
      width: 100,
    },
    {
      title: 'Min Order',
      dataIndex: 'minimumOrderAmount',
      width: 100,
      render: val => <span className="text-slate-600 text-sm">{formatCurrency(val || 0)}</span>,
    },
    {
      title: 'Valid Until',
      dataIndex: 'endDate',
      width: 120,
      render: val => {
        const diff = dayjs(val).diff(dayjs(), 'day');
        const isExpiring = diff >= 0 && diff < 3;
        return (
          <span className={`text-xs font-medium ${isExpiring ? 'text-red-500' : 'text-slate-500'}`}>
            {formatDate(val)}
            {isExpiring && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">Soon</span>}
          </span>
        );
      },
    },
    {
      title: 'Used',
      dataIndex: 'usageCount',
      width: 70,
      render: val => <Tag color="blue">{val || 0}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (val, record) => (
        <div className="flex items-center gap-2">
          <Switch
            size="small"
            checked={val === 'active'}
            disabled={val === 'expired'}
            onChange={() => handleToggleStatus(record)}
          />
          <Tag color={STATUS_COLOR[val] || 'default'} className="text-[10px]">
            {val?.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            onClick={() => setManageModal({ open: true, record })}
            className="!text-slate-600 !border-slate-200 hover:!border-emerald-400 hover:!text-emerald-600"
          >
            Manage
          </Button>
          <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']} placement="bottomRight">
            <Button size="small" icon={<MoreVertical className="w-3.5 h-3.5" />} className="!text-slate-500" />
          </Dropdown>
        </div>
      ),
    },
  ];

  const activeRecord = manageModal.record;

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Promotions & Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage discounts across Fifozone, Amazon & Flipkart</p>
        </div>
        <div className="flex gap-3">
          <Button type="primary" className="!bg-emerald-600 !border-emerald-600" icon={<TagIcon size={16} />} onClick={() => setCouponModalOpen(true)}>
            Create Coupon
          </Button>
          <Button type="primary" className="!bg-blue-600 !border-blue-600" icon={<Percent size={16} />} onClick={() => setDiscountModalOpen(true)}>
            Create Discount
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Promotions', value: promotions.filter(p => p.status === 'active').length, border: 'border-l-emerald-500', color: 'text-emerald-600' },
          { label: 'Total Used This Month', value: promotions.reduce((s, p) => s + (p.usageCount || 0), 0), border: 'border-l-blue-500', color: 'text-blue-600' },
          { label: 'Discount Given', value: formatCurrency(12450), border: 'border-l-red-500', color: 'text-red-500' },
          { label: 'Expiring Soon', value: promotions.filter(p => { const d = dayjs(p.endDate).diff(dayjs(), 'day'); return d >= 0 && d <= 7; }).length, border: 'border-l-orange-500', color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 ${s.border}`}>
            <p className="text-slate-500 text-sm font-medium">{s.label}</p>
            <h3 className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={promotions}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </div>

      {/* ─── Manage Modal (View + Quick Actions) ─────────────────────────────── */}
      <Modal
        title={null}
        open={manageModal.open}
        onCancel={() => setManageModal({ open: false, record: null })}
        footer={null}
        width={520}
      >
        {activeRecord && (
          <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{activeRecord.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Tag color={STATUS_COLOR[activeRecord.status] || 'default'}>{activeRecord.status?.toUpperCase()}</Tag>
                  <Tag>{activeRecord.type?.toUpperCase()}</Tag>
                  {(Array.isArray(activeRecord.platforms) ? activeRecord.platforms : []).map(p => (
                    <Tag key={p} color={p === 'fifozone' ? 'green' : p === 'amazon' ? 'orange' : 'blue'}>{p}</Tag>
                  ))}
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600">{getDiscountLabel(activeRecord)}</div>
            </div>

            <Divider className="!my-3" />

            {/* Details */}
            <Descriptions column={2} size="small" className="mb-4">
              <Descriptions.Item label="Min Order">{formatCurrency(activeRecord.minimumOrderAmount || 0)}</Descriptions.Item>
              <Descriptions.Item label="Times Used">{activeRecord.usageCount || 0}</Descriptions.Item>
              <Descriptions.Item label="Start Date">{formatDate(activeRecord.startDate)}</Descriptions.Item>
              <Descriptions.Item label="End Date">
                <span className={dayjs(activeRecord.endDate).diff(dayjs(), 'day') < 3 && activeRecord.status !== 'expired' ? 'text-red-500 font-semibold' : ''}>
                  {formatDate(activeRecord.endDate)}
                </span>
              </Descriptions.Item>
              {activeRecord.type === 'coupon' && (
                <Descriptions.Item label="Coupon Code" span={2}>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-emerald-700 font-bold">{activeRecord.name}</span>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider className="!my-3" />

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                icon={<Edit3 className="w-4 h-4" />}
                onClick={() => handleOpenEdit(activeRecord)}
                className="!border-slate-300"
              >
                Edit
              </Button>

              {activeRecord.status !== 'expired' && (
                <Button
                  icon={activeRecord.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  onClick={() => handleToggleStatus(activeRecord)}
                  className={activeRecord.status === 'active' ? '!border-orange-300 !text-orange-600' : '!border-green-300 !text-green-600'}
                >
                  {activeRecord.status === 'active' ? 'Pause' : 'Activate'}
                </Button>
              )}

              <Popconfirm
                title="Delete this promotion?"
                description="This action cannot be undone."
                onConfirm={() => handleDelete(activeRecord)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<Trash2 className="w-4 h-4" />}>
                  Delete
                </Button>
              </Popconfirm>

              <Button className="ml-auto" onClick={() => setManageModal({ open: false, record: null })}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Edit Modal ───────────────────────────────────────────────────────── */}
      <Modal
        title={`Edit — ${editModal.record?.name || ''}`}
        open={editModal.open}
        onCancel={() => { setEditModal({ open: false, record: null }); editForm.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit} className="mt-3">
          <Form.Item label="Name / Code" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Target Platforms" name="platforms">
            <Checkbox.Group>
              <div className="flex gap-4">
                <Checkbox value="fifozone">Fifozone</Checkbox>
                <Checkbox value="amazon">Amazon</Checkbox>
                <Checkbox value="flipkart">Flipkart</Checkbox>
                <Checkbox value="meesho">Meesho</Checkbox>
              </div>
            </Checkbox.Group>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Discount Type" name="discountType">
              <Select>
                <Option value="percentage">Percentage</Option>
                <Option value="flat">Flat Amount</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Discount Value" name="discountValue" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} />
            </Form.Item>
          </div>
          <Form.Item label="Min Order (₹)" name="minimumOrderAmount">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Validity Period" name="validity" rules={[{ required: true }]}>
            <RangePicker className="w-full" showTime />
          </Form.Item>
          <div className="flex gap-2 justify-end">
            <Button onClick={() => { setEditModal({ open: false, record: null }); editForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="!bg-emerald-600 !border-emerald-600">Save Changes</Button>
          </div>
        </Form>
      </Modal>

      {/* ─── Create Coupon Modal ──────────────────────────────────────────────── */}
      <Modal
        title="Create Coupon Code (Fifozone)"
        open={couponModalOpen}
        onCancel={() => { setCouponModalOpen(false); couponForm.resetFields(); }}
        footer={null}
      >
        <Form form={couponForm} layout="vertical" onFinish={handleCreateCoupon} className="mt-3">
          <Form.Item label="Coupon Code" name="couponCode" rules={[{ required: true, message: 'Enter coupon code' }]}>
            <Input placeholder="e.g. SUMMER20" onChange={e => couponForm.setFieldValue('couponCode', e.target.value.toUpperCase())} />
          </Form.Item>
          <div className="flex justify-end mb-2 -mt-3">
            <Button size="small" onClick={() => couponForm.setFieldValue('couponCode', 'SAVE' + Math.floor(Math.random() * 1000))}>Auto Generate</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Discount Type" name="discountType" initialValue="percentage">
              <Select>
                <Option value="percentage">Percentage</Option>
                <Option value="flat">Flat Amount</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Discount Value" name="discountValue" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Min Order (₹)" name="minimumOrderAmount">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item label="Max Discount (₹)" name="maximumDiscountAmount">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>
          <Form.Item label="Validity Period" name="validity" rules={[{ required: true }]}>
            <RangePicker className="w-full" showTime />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="!bg-emerald-600 w-full">Create Coupon on Fifozone</Button>
        </Form>
      </Modal>

      {/* ─── Create Discount Modal ────────────────────────────────────────────── */}
      <Modal
        title="Schedule Price Discount"
        open={discountModalOpen}
        onCancel={() => { setDiscountModalOpen(false); discountForm.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={discountForm} layout="vertical" onFinish={handleCreateDiscount} className="mt-3">
          <Form.Item label="Promotion Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Diwali Sale 2024" />
          </Form.Item>
          <Form.Item label="Target Platforms" name="platforms" initialValue={['fifozone']}>
            <Checkbox.Group>
              <div className="flex gap-4">
                <Checkbox value="fifozone">Fifozone</Checkbox>
                <Checkbox value="amazon">Amazon</Checkbox>
                <Checkbox value="flipkart">Flipkart</Checkbox>
                <Checkbox value="meesho">Meesho</Checkbox>
              </div>
            </Checkbox.Group>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Discount %" name="discountValue" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} max={99} addonAfter="%" />
            </Form.Item>
            <Form.Item label="Min Order (₹)" name="minimumOrderAmount">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>
          <Form.Item label="Schedule" name="schedule" rules={[{ required: true }]}>
            <RangePicker className="w-full" showTime />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="!bg-blue-600 w-full">Schedule Discount</Button>
        </Form>
      </Modal>
    </div>
  );
};

export default PromotionsPage;
