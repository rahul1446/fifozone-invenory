import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Select, Button, Input, Tag, Tooltip, Modal } from 'antd';
import { Search, Download, Filter } from 'lucide-react';
import { getInventoryLogsApi } from '../../api/inventoryApi';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

const { RangePicker } = DatePicker;
const { Option } = Select;

const InventoryLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [filters, setFilters] = useState({
    changeType: 'All',
    platform: 'All',
  });

  const fetchLogs = async (page = 1, pageSize = 25) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        search: debouncedSearch,
        changeType: filters.changeType === 'All' ? undefined : filters.changeType,
        platform: filters.platform === 'All' ? undefined : filters.platform,
      };
      const response = await getInventoryLogsApi(params);
      
      const data = response.data?.data ?? response.data;
      // Handle the case where API returns direct array or paginated object
      if (Array.isArray(data)) {
        setLogs(data);
        setPagination({ current: page, pageSize, total: data.length });
      } else {
        const logs = data.logs ?? [];
        const total = data.total ?? data.pagination?.total ?? 0;
        setLogs(logs);
        setPagination({
          current: data.pagination?.page || page,
          pageSize: data.pagination?.limit || pageSize,
          total
        });
      }
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.changeType, filters.platform]);

  const handleTableChange = (newPagination) => {
    fetchLogs(newPagination.current, newPagination.pageSize);
  };

  const getChangeTypeTag = (type) => {
    const map = {
      sale: 'blue', return: 'green', manual_add: 'emerald', manual_remove: 'red',
      adjustment: 'purple', sync_update: 'cyan', restock: 'teal', damaged: 'rose',
      expired: 'orange', delivered: 'default'
    };
    return <Tag color={map[type] || 'default'}>{type?.replace('_', ' ').toUpperCase()}</Tag>;
  };

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'date',
      render: (val) => formatDate(val),
      width: 180
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-800">{record.productName || 'Unknown Product'}</div>
          <div className="text-xs text-slate-500 font-mono">{record.sku || record.productId?.substring(0, 8)}</div>
        </div>
      )
    },
    {
      title: 'Change Type',
      dataIndex: 'changeType',
      key: 'type',
      render: (val) => getChangeTypeTag(val)
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (val) => <Tag>{val}</Tag>
    },
    {
      title: 'Previous',
      dataIndex: 'previousStock',
      key: 'prev'
    },
    {
      title: 'Change',
      dataIndex: 'changeQuantity',
      key: 'change',
      render: (val) => (
        <span className={`font-bold ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : ''}`}>
          {val > 0 ? `+${val}` : val}
        </span>
      )
    },
    {
      title: 'New',
      dataIndex: 'newStock',
      key: 'new',
      className: 'font-semibold'
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note',
      render: (val) => val && (
        <Tooltip title={val}>
          <span className="truncate block max-w-[200px] text-slate-600">{val}</span>
        </Tooltip>
      )
    },
    {
      title: 'User',
      key: 'user',
      render: (_, record) => record.performedBy?.name || 'System'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" type="link" onClick={() => { setSelectedLog(record); setDetailsModalOpen(true); }}>
          View Details
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Complete history of all stock changes across platforms</p>
        </div>
        <Button icon={<Download size={16} />}>Export CSV</Button>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input 
            placeholder="Search product name or SKU..." 
            prefix={<Search size={16} />} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="lg:col-span-2"
          />
          <Select 
            value={filters.changeType} 
            onChange={v => setFilters(p => ({ ...p, changeType: v }))}
          >
            <Option value="All">All Change Types</Option>
            <Option value="sale">Sale</Option>
            <Option value="return">Return</Option>
            <Option value="sync_update">Sync Update</Option>
            <Option value="manual_add">Manual Add</Option>
            <Option value="manual_remove">Manual Remove</Option>
            <Option value="restock">Restock</Option>
            <Option value="damaged">Damaged</Option>
          </Select>
          <Select 
            value={filters.platform} 
            onChange={v => setFilters(p => ({ ...p, platform: v }))}
          >
            <Option value="All">All Platforms</Option>
            <Option value="fifozone">Fifozone</Option>
            <Option value="amazon">Amazon</Option>
            <Option value="flipkart">Flipkart</Option>
            <Option value="warehouse">Warehouse</Option>
            <Option value="internal">Internal</Option>
          </Select>
          <RangePicker className="w-full" />
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="text-slate-500"><Filter size={14} className="inline mr-1" /> Log filters applied</div>
          <Button type="link" onClick={() => { setSearchTerm(''); setFilters({ changeType: 'All', platform: 'All' }); }}>Clear Filters</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </div>

      <Modal
        title="Log Details"
        open={detailsModalOpen}
        onCancel={() => setDetailsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalOpen(false)}>Close</Button>
        ]}
        width={600}
      >
        {selectedLog && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4 overflow-auto max-h-96">
            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryLogsPage;
