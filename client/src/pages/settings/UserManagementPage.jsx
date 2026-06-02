import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Dropdown } from 'antd';
import { Plus, MoreHorizontal, UserCheck, UserX, UserPlus } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { formatRelativeTime } from '../../utils/formatters';

const { Option } = Select;

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/users');
      // Response: { statusCode, data: [ users array ], message }
      const data = response?.data?.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // Show empty table rather than crash
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.post('/users', values);
      message.success('User added successfully');
      setModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await axiosInstance.patch(`/users/${id}`, { status: newStatus });
      message.success(`User marked as ${newStatus}`);
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            {(record.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-800">{record.name || '(no name)'}</div>
            <div className="text-xs text-slate-500">{record.email || ''}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'} className="px-3 py-1 rounded-full border-0 font-medium">
          {(role || 'staff').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (val) => val || '-'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const s = status || 'inactive';
        return (
          <span className={`flex items-center gap-1.5 ${s === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <div className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        );
      }
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (val) => val ? formatRelativeTime(val) : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              { key: 'edit', label: 'Edit User' },
              { type: 'divider' },
              { 
                key: 'toggle', 
                label: record.status === 'active' ? 'Deactivate' : 'Activate', 
                icon: record.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />,
                danger: record.status === 'active',
                onClick: () => handleToggleStatus(record._id, record.status) 
              }
            ]
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreHorizontal size={18} className="text-slate-500" />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage staff access and roles</p>
        </div>
        <Button 
          type="primary" 
          icon={<Plus size={16} />} 
          onClick={() => setModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
        >
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={false}
        />
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <UserPlus size={20} className="text-emerald-600" />
            <span>Add New User</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleAddUser} className="mt-4">
          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Please enter name' }]}>
            <Input size="large" />
          </Form.Item>
          
          <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input size="large" />
          </Form.Item>

          <Form.Item label="Phone (Optional)" name="phone">
            <Input size="large" />
          </Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password required', min: 6 }]}>
              <Input.Password size="large" />
            </Form.Item>
            
            <Form.Item label="Role" name="role" rules={[{ required: true }]} initialValue="manager">
              <Select size="large">
                <Option value="admin">Admin</Option>
                <Option value="manager">Manager</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="bg-emerald-600 hover:bg-emerald-500">
              Create User
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
