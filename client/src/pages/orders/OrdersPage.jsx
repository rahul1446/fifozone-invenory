import React, { useEffect, useState } from 'react';
import { getOrdersApi } from '../../api/orderApi';
import { Table, Tag, Input, Button, Dropdown } from 'antd';
import { Search, Download, MoreVertical, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

const OrdersPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const fetchOrders = async (page = 1, limit = 20, search = '') => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ page, limit, search });
      setOrders(res.data.orders);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total
      });
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, pagination.pageSize, debouncedSearch);
  }, [debouncedSearch]);

  const handleTableChange = (newPagination) => {
    fetchOrders(newPagination.current, newPagination.pageSize, debouncedSearch);
  };

  const getStatusColor = (status) => {
    const map = {
      pending: 'processing',
      confirmed: 'blue',
      processing: 'cyan',
      shipped: 'purple',
      out_for_delivery: 'orange',
      delivered: 'success',
      cancelled: 'error',
      return_requested: 'warning',
      returned: 'default',
      refunded: 'default'
    };
    return map[status] || 'default';
  };

  const columns = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text) => <span className="font-semibold text-emerald-700">{text}</span>
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <span className="text-slate-600 text-sm">{formatDate(date)}</span>
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      render: (customer) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">{customer?.name}</span>
          <span className="text-xs text-slate-500">{customer?.phone}</span>
        </div>
      )
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform) => (
        <Tag className="uppercase tracking-wider text-[10px] font-bold">
          {platform}
        </Tag>
      )
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => <span className="font-medium">{formatCurrency(amount)}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)} className="uppercase text-[10px] font-bold">{status.replace(/_/g, ' ')}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<Eye size={16} className="text-slate-500 hover:text-emerald-600" />} 
          onClick={() => navigate(`/orders/${record._id}`)}
        />
      )
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Order Management</h1>
          <p className="text-sm text-slate-500">Track and manage active sales across all platforms.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            placeholder="Search Order ID, Customer..."
            prefix={<Search size={16} className="text-slate-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 rounded-lg"
          />
          <Button icon={<Download size={16} />}>
            Export
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="_id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} orders`
        }}
        loading={loading}
        onChange={handleTableChange}
        className="border border-slate-100 rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default OrdersPage;
