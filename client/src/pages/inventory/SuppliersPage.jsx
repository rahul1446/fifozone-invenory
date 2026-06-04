import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select } from 'antd';
import { Building2, Users, PlusCircle, Edit2 } from 'lucide-react';

const cityOptions = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Ahmedabad', 'Kolkata'];

const mockSuppliers = [
  { key: '1', name: 'Himalaya Drug Company', contact: 'Suresh Menon', phone: '+91 98201 23456', email: 'suresh@himalaya.com', city: 'Bengaluru', products: 12, status: 'Active' },
  { key: '2', name: 'Virbac India Pvt. Ltd.', contact: 'Ananya Sharma', phone: '+91 98765 43210', email: 'ananya@virbac.in', city: 'Mumbai', products: 8, status: 'Active' },
  { key: '3', name: 'Savavet Distributors', contact: 'Ramesh Pillai', phone: '+91 93456 78901', email: 'ramesh@savavet.co.in', city: 'Chennai', products: 6, status: 'Active' },
  { key: '4', name: 'Royal Canin India', contact: 'Priya Nair', phone: '+91 99887 65432', email: 'priya@royalcanin.com', city: 'Delhi', products: 4, status: 'Active' },
  { key: '5', name: 'Beaphar India Imports', contact: 'Kiran Joshi', phone: '+91 97651 23456', email: 'kiran@beaphar.in', city: 'Pune', products: 5, status: 'Active' },
  { key: '6', name: 'Mars Petcare (Pedigree)', contact: 'Rohit Verma', phone: '+91 98111 22334', email: 'rohit@mars.com', city: 'Hyderabad', products: 7, status: 'Active' },
  { key: '7', name: 'Bayer Animal Health', contact: 'Sunita Kapoor', phone: '+91 94563 21789', email: 'sunita@bayer.com', city: 'Mumbai', products: 3, status: 'Inactive' },
  { key: '8', name: 'Indo Pharma Vet Supplies', contact: 'Aditya Rao', phone: '+91 90000 11223', email: 'aditya@indopharma.in', city: 'Ahmedabad', products: 9, status: 'Active' },
];

const totalSuppliers = mockSuppliers.length;
const activeSuppliers = mockSuppliers.filter(s => s.status === 'Active').length;

const StatCard = ({ title, value, icon: Icon, borderColor, bgColor, textColor }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 flex items-center gap-4`}>
    <div className={`${bgColor} p-3 rounded-full`}>
      <Icon size={22} className={textColor} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="font-bold text-2xl text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const SuppliersPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setSelectedSupplier(record);
    editForm.setFieldsValue(record);
    setEditModal(true);
  };

  const handleSubmitAdd = () => {
    form.validateFields().then(() => {
      setModalOpen(false);
    });
  };

  const handleSubmitEdit = () => {
    editForm.validateFields().then(() => {
      setEditModal(false);
    });
  };

  const columns = [
    {
      title: 'Supplier Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={14} className="text-blue-600" />
          </div>
          <span className="font-semibold text-slate-800 text-sm">{text}</span>
        </div>
      ),
    },
    {
      title: 'Contact Person',
      dataIndex: 'contact',
      key: 'contact',
      render: (v) => <span className="text-slate-600 text-sm">{v}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v) => <a href={`mailto:${v}`} className="text-blue-500 text-xs hover:underline">{v}</a>,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      render: (v) => <span className="text-slate-600 text-sm">{v}</span>,
    },
    {
      title: 'Products',
      dataIndex: 'products',
      key: 'products',
      align: 'center',
      render: (v) => (
        <span className="bg-violet-50 text-violet-700 font-bold text-sm px-2.5 py-1 rounded-full">{v}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (v) => <Tag color={v === 'Active' ? 'success' : 'error'} className="font-medium text-xs">{v}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Button
          size="small"
          icon={<Edit2 size={12} />}
          onClick={() => handleEdit(record)}
          className="rounded-lg border-slate-200 text-slate-600 text-xs"
        >
          Edit
        </Button>
      ),
    },
  ];

  const supplierFormFields = (formInstance) => (
    <div className="grid grid-cols-2 gap-4">
      <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]} className="col-span-2">
        <Input placeholder="e.g. Himalaya Drug Company" />
      </Form.Item>
      <Form.Item name="contact" label="Contact Person" rules={[{ required: true }]}>
        <Input placeholder="e.g. Suresh Menon" />
      </Form.Item>
      <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
        <Input placeholder="+91 98XXX XXXXX" />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
        <Input placeholder="contact@supplier.com" />
      </Form.Item>
      <Form.Item name="city" label="City" rules={[{ required: true }]}>
        <Select placeholder="Select city" options={cityOptions.map(c => ({ value: c, label: c }))} />
      </Form.Item>
    </div>
  );

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Supplier Management</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your supplier relationships</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard title="Total Suppliers" value={totalSuppliers} icon={Building2} borderColor="border-blue-500" bgColor="bg-blue-50" textColor="text-blue-600" />
        <StatCard title="Active Suppliers" value={activeSuppliers} icon={Users} borderColor="border-emerald-500" bgColor="bg-emerald-50" textColor="text-emerald-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">All Suppliers</h2>
          <Button
            type="primary"
            icon={<PlusCircle size={15} />}
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 border-none rounded-lg font-medium"
          >
            Add Supplier
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={mockSuppliers}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} suppliers` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
        />
      </div>

      {/* Add Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 p-2 rounded-lg">
              <PlusCircle size={16} className="text-blue-600" />
            </div>
            <span className="font-semibold text-slate-800">Add New Supplier</span>
          </div>
        }
        open={modalOpen}
        onOk={handleSubmitAdd}
        onCancel={() => setModalOpen(false)}
        okText="Save Supplier"
        okButtonProps={{ className: 'bg-blue-600 hover:bg-blue-700 border-none rounded-lg font-medium' }}
        cancelButtonProps={{ className: 'rounded-lg border-slate-200' }}
        width={580}
      >
        <Form form={form} layout="vertical" className="mt-4">
          {supplierFormFields(form)}
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="bg-amber-50 p-2 rounded-lg">
              <Edit2 size={16} className="text-amber-600" />
            </div>
            <span className="font-semibold text-slate-800">Edit Supplier</span>
          </div>
        }
        open={editModal}
        onOk={handleSubmitEdit}
        onCancel={() => setEditModal(false)}
        okText="Update Supplier"
        okButtonProps={{ className: 'bg-amber-500 hover:bg-amber-600 border-none rounded-lg font-medium' }}
        cancelButtonProps={{ className: 'rounded-lg border-slate-200' }}
        width={580}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          {supplierFormFields(editForm)}
        </Form>
      </Modal>
    </div>
  );
};

export default SuppliersPage;
