import React, { useState, useEffect, useCallback } from 'react';
import { Button, Switch, Modal, Form, Input, Select, InputNumber, Checkbox, Tag, Empty, Spin, Tooltip } from 'antd';
import { Plus, Trash2, Bell, AlertTriangle, TrendingDown, RefreshCw, Zap, Edit2 } from 'lucide-react';
import { getAlertRulesApi, createAlertRuleApi, updateAlertRuleApi, deleteAlertRuleApi } from '../../api/alertApi';
import toast from 'react-hot-toast';

const TYPE_OPTIONS = [
  { value: 'low_stock',    label: 'Low Stock Alert',    icon: <AlertTriangle size={14} />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'no_sale',      label: 'No Sale Alert',      icon: <TrendingDown size={14} />,  color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { value: 'price_drop',   label: 'Price Drop Alert',   icon: <TrendingDown size={14} />,  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'sync_failure', label: 'Sync Failure Alert', icon: <Zap size={14} />,           color: 'bg-red-100 text-red-700 border-red-200' },
];

const PLATFORM_OPTIONS = [
  { value: 'fifozone',  label: 'Fifozone' },
  { value: 'amazon',   label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'all',      label: 'All Platforms' },
];

const ROLE_OPTIONS = [
  { value: 'admin',   label: 'Admin' },
  { value: 'manager', label: 'Manager' },
];

const typeConfig = {
  low_stock:    { color: 'bg-amber-100 text-amber-700 border-amber-200',   label: 'Low Stock',    icon: <AlertTriangle size={13} /> },
  no_sale:      { color: 'bg-rose-100 text-rose-700 border-rose-200',      label: 'No Sale',      icon: <TrendingDown size={13} /> },
  price_drop:   { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Price Drop',  icon: <TrendingDown size={13} /> },
  sync_failure: { color: 'bg-red-100 text-red-700 border-red-200',         label: 'Sync Failure', icon: <Zap size={13} /> },
};

const AlertRuleSummary = ({ rule }) => {
  const parts = [];
  if (rule.conditions?.stockThreshold) parts.push(`Stock < ${rule.conditions.stockThreshold}`);
  if (rule.conditions?.noSaleDays)      parts.push(`No sale in ${rule.conditions.noSaleDays} days`);
  if (rule.conditions?.priceDropPercent) parts.push(`Price drops ≥ ${rule.conditions.priceDropPercent}%`);
  if (rule.conditions?.platform && rule.conditions.platform !== 'all') parts.push(`Platform: ${rule.conditions.platform}`);
  return <span className="text-xs text-slate-500">{parts.join(' · ') || 'No conditions set'}</span>;
};

const AlertRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAlertRulesApi();
      const data = res.data?.data || res.data;
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const openCreate = () => {
    setEditingRule(null);
    setSelectedType(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setSelectedType(rule.type);
    form.setFieldsValue({
      name: rule.name,
      type: rule.type,
      stockThreshold: rule.conditions?.stockThreshold,
      noSaleDays: rule.conditions?.noSaleDays,
      priceDropPercent: rule.conditions?.priceDropPercent,
      platform: rule.conditions?.platform || 'all',
      sendEmail: rule.actions?.sendEmail,
      sendWhatsApp: rule.actions?.sendWhatsApp,
      notifyRoles: rule.actions?.notifyRoles || [],
    });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        type: values.type,
        conditions: {
          stockThreshold: values.stockThreshold,
          noSaleDays: values.noSaleDays,
          priceDropPercent: values.priceDropPercent,
          platform: values.platform || 'all',
        },
        actions: {
          sendEmail: !!values.sendEmail,
          sendWhatsApp: !!values.sendWhatsApp,
          notifyRoles: values.notifyRoles || [],
        },
        isActive: true,
      };

      if (editingRule) {
        await updateAlertRuleApi(editingRule._id, payload);
        toast.success('Alert rule updated');
      } else {
        await createAlertRuleApi(payload);
        toast.success('Alert rule created');
      }
      setModalOpen(false);
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save alert rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Delete Alert Rule?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setDeletingId(id);
        try {
          await deleteAlertRuleApi(id);
          toast.success('Alert rule deleted');
          fetchRules();
        } catch (err) {
          toast.error('Failed to delete rule');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleToggleActive = async (rule) => {
    try {
      await updateAlertRuleApi(rule._id, { isActive: !rule.isActive });
      setRules(prev => prev.map(r => r._id === rule._id ? { ...r, isActive: !r.isActive } : r));
    } catch (err) {
      toast.error('Failed to toggle rule');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell size={22} className="text-emerald-600" />
            Alert Rules
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automate notifications for stock, sales, sync, and price events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<RefreshCw size={15} />} onClick={fetchRules} loading={loading} className="!flex !items-center !gap-1.5 !text-sm">
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<Plus size={15} />}
            onClick={openCreate}
            className="!flex !items-center !gap-1.5 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
          >
            New Rule
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TYPE_OPTIONS.map(t => {
          const count = rules.filter(r => r.type === t.value && r.isActive).length;
          return (
            <div key={t.value} className={`p-4 rounded-xl border ${t.color} flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-full bg-white/60 flex items-center justify-center">
                {t.icon}
              </div>
              <div>
                <p className="text-xs font-semibold">{t.label}</p>
                <p className="text-xl font-bold">{count} active</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">All Rules ({rules.length})</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spin size="large" /></div>
        ) : rules.length === 0 ? (
          <Empty
            description={
              <div className="text-center">
                <p className="text-slate-500 font-medium">No alert rules yet</p>
                <p className="text-slate-400 text-sm mt-1">Create your first rule to start receiving automated alerts</p>
              </div>
            }
            className="py-16"
          >
            <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}
              className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600">
              Create First Rule
            </Button>
          </Empty>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map(rule => {
              const cfg = typeConfig[rule.type] || typeConfig.sync_failure;
              return (
                <div key={rule._id}
                  className={`px-6 py-4 flex items-start justify-between gap-4 transition-colors hover:bg-slate-50/60 ${!rule.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-slate-800">{rule.name}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <AlertRuleSummary rule={rule} />
                      <div className="flex items-center gap-3 mt-1.5">
                        {rule.actions?.sendEmail && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">📧 Email</span>
                        )}
                        {rule.actions?.sendWhatsApp && (
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">💬 WhatsApp</span>
                        )}
                        {(rule.actions?.notifyRoles || []).map(role => (
                          <span key={role} className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Tooltip title={rule.isActive ? 'Disable rule' : 'Enable rule'}>
                      <Switch
                        size="small"
                        checked={rule.isActive}
                        onChange={() => handleToggleActive(rule)}
                        className={rule.isActive ? '!bg-emerald-500' : ''}
                      />
                    </Tooltip>
                    <Button
                      size="small"
                      icon={<Edit2 size={13} />}
                      onClick={() => openEdit(rule)}
                      className="!text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<Trash2 size={13} />}
                      loading={deletingId === rule._id}
                      onClick={() => handleDelete(rule._id)}
                      className="!text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        title={editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item name="name" label="Rule Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g., Low Stock Warning for Dog Products" />
          </Form.Item>

          <Form.Item name="type" label="Alert Type" rules={[{ required: true }]}>
            <Select placeholder="Select alert type" onChange={v => setSelectedType(v)}>
              {TYPE_OPTIONS.map(t => (
                <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Conditions: Conditional based on type */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Trigger Conditions</p>
            {selectedType === 'low_stock' && (
              <Form.Item name="stockThreshold" label="Stock Threshold (units)" className="!mb-0">
                <InputNumber min={0} max={10000} className="!w-full" placeholder="e.g., 10" />
              </Form.Item>
            )}
            {selectedType === 'no_sale' && (
              <Form.Item name="noSaleDays" label="No Sale For (days)" className="!mb-0">
                <InputNumber min={1} max={365} className="!w-full" placeholder="e.g., 30" />
              </Form.Item>
            )}
            {selectedType === 'price_drop' && (
              <Form.Item name="priceDropPercent" label="Price Drop % Threshold" className="!mb-0">
                <InputNumber min={1} max={100} className="!w-full" placeholder="e.g., 20" />
              </Form.Item>
            )}
            {selectedType === 'sync_failure' && (
              <p className="text-sm text-slate-500">This alert triggers whenever a platform sync fails.</p>
            )}
            {!selectedType && (
              <p className="text-sm text-slate-400 italic">Select an alert type above to configure conditions</p>
            )}
            <Form.Item name="platform" label="Platform" className="!mb-0 !mt-3">
              <Select placeholder="Select platform">
                {PLATFORM_OPTIONS.map(p => (
                  <Select.Option key={p.value} value={p.value}>{p.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Actions */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notification Channels</p>
            <Form.Item name="sendEmail" valuePropName="checked" className="!mb-2">
              <Checkbox>Send Email Notification</Checkbox>
            </Form.Item>
            <Form.Item name="sendWhatsApp" valuePropName="checked" className="!mb-2">
              <Checkbox>Send WhatsApp Notification</Checkbox>
            </Form.Item>
            <Form.Item name="notifyRoles" label="Notify Roles" className="!mb-0">
              <Select mode="multiple" placeholder="Select roles to notify">
                {ROLE_OPTIONS.map(r => (
                  <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
            >
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AlertRulesPage;
