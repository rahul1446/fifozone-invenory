import React, { useState, useEffect } from 'react';
import { Table, Alert, Button, message, Tag } from 'antd';
import { Package, IndianRupee, Clock, RefreshCw } from 'lucide-react';
import { getProductsApi, updateProductApi } from '../../api/productApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatCard from '../../components/common/StatCard';
import dayjs from 'dayjs';

const DeadProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, lockedValue: 0, avgDays: 0 });

  const fetchDeadProducts = async () => {
    setLoading(true);
    try {
      const response = await getProductsApi({ isDead: true, limit: 1000 });
      const deadProducts = response.data.products || [];
      setProducts(deadProducts);
      
      let totalValue = 0;
      let totalDays = 0;
      let validDaysCount = 0;

      deadProducts.forEach(p => {
        totalValue += (p.totalStock || 0) * (p.costPrice || 0);
        if (p.lastSoldDate) {
          const days = dayjs().diff(dayjs(p.lastSoldDate), 'day');
          totalDays += days;
          validDaysCount++;
        }
      });

      setStats({
        total: deadProducts.length,
        lockedValue: totalValue,
        avgDays: validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0
      });

    } catch (error) {
      message.error('Failed to fetch dead products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadProducts();
  }, []);

  const handleMarkActive = async (id) => {
    try {
      await updateProductApi(id, { isDead: false });
      message.success('Product marked as active');
      fetchDeadProducts();
    } catch (error) {
      message.error('Failed to update product');
    }
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => {
        const image = record.images?.find(img => img.isPrimary)?.url || record.images?.[0]?.url;
        return (
          <div className="flex items-center gap-3">
            {image ? (
              <img src={image} alt={record.masterName} className="w-10 h-10 rounded border object-cover" />
            ) : (
              <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                <Package size={20} />
              </div>
            )}
            <div>
              <div className="font-semibold text-slate-800">{record.masterName}</div>
              <div className="text-xs text-slate-500">{record.sku}</div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Category / Brand',
      key: 'cat',
      render: (_, record) => (
        <div>
          <div>{record.category}</div>
          <div className="text-xs text-slate-500">{record.brand}</div>
        </div>
      )
    },
    {
      title: 'Total Stock',
      dataIndex: 'totalStock',
      key: 'stock',
      className: 'font-semibold'
    },
    {
      title: 'Value Locked',
      key: 'valueLocked',
      render: (_, record) => (
        <span className="text-red-600 font-semibold">
          {formatCurrency((record.totalStock || 0) * (record.costPrice || 0))}
        </span>
      )
    },
    {
      title: 'Last Sold Date',
      dataIndex: 'lastSoldDate',
      key: 'lastSoldDate',
      render: (date) => date ? formatDate(date) : <span className="text-slate-400">Never</span>
    },
    {
      title: 'Days Since Sale',
      key: 'days',
      render: (_, record) => {
        if (!record.lastSoldDate) return <Tag color="error">Infinite</Tag>;
        const days = dayjs().diff(dayjs(record.lastSoldDate), 'day');
        return <Tag color={days > 90 ? 'error' : days > 60 ? 'warning' : 'default'}>{days} days</Tag>;
      }
    },
    {
      title: 'Sold (MTD / YTD)',
      key: 'sold',
      render: (_, record) => `${record.soldThisMonth || 0} / ${record.soldThisYear || 0}`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" onClick={() => handleMarkActive(record._id)}>
          Mark Active
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dead Products</h1>
          <p className="text-sm text-slate-500 mt-1">Identify and manage slow-moving inventory</p>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchDeadProducts}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Dead Products"
          value={stats.total}
          icon={<Package size={20} />}
          color="border-rose-500"
          loading={loading}
        />
        <StatCard
          title="Stock Value Locked"
          value={formatCurrency(stats.lockedValue)}
          icon={<IndianRupee size={20} />}
          color="border-amber-500"
          loading={loading}
        />
        <StatCard
          title="Avg Days Since Last Sale"
          value={stats.avgDays}
          icon={<Clock size={20} />}
          color="border-blue-500"
          loading={loading}
        />
      </div>

      {stats.lockedValue > 0 && (
        <Alert
          message={`You have ${formatCurrency(stats.lockedValue)} locked in slow-moving inventory.`}
          description="Consider running a clearance sale or discounting these products to recover cash flow."
          type="warning"
          showIcon
          className="border-amber-200 bg-amber-50"
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={products}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 25 }}
        />
      </div>
    </div>
  );
};

export default DeadProductsPage;
