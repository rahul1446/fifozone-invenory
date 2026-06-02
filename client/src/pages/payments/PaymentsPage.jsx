import React, { useState, useEffect } from 'react';
import { Tabs, Table, Tag, Button, Select, DatePicker } from 'antd';
import { Download, CreditCard, Activity, DollarSign, Wallet } from 'lucide-react';
import { getPaymentOverviewApi, getTransactionsApi, getFeeBreakdownApi, exportPaymentsApi } from '../../api/paymentApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const PaymentsPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await getTransactionsApi();
      const transactions = res.data?.data?.transactions ?? res.data?.data ?? [];
      if (!transactions || transactions.length === 0) {
        setTransactions([
          { _id: '1', date: new Date().toISOString(), platform: 'amazon', type: 'sale', orderNumber: 'AMZ-123', product: 'Wireless Mouse', gross: 1200, fee: 150, gst: 27, net: 1023, status: 'settled', settlementDate: new Date().toISOString() },
          { _id: '2', date: new Date().toISOString(), platform: 'fifozone', type: 'sale', orderNumber: 'FZ-456', product: 'Keyboard', gross: 2500, fee: 100, gst: 18, net: 2382, status: 'pending', settlementDate: null }
        ]);
      } else {
        setTransactions(transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'transactionDate', render: val => formatDate(val) },
    { title: 'Platform', dataIndex: 'platform', render: val => <Tag color={val === 'fifozone' ? 'green' : val === 'amazon' ? 'orange' : 'blue'}>{val?.toUpperCase()}</Tag> },
    { title: 'Type', dataIndex: 'type', render: val => <Tag>{val?.toUpperCase()}</Tag> },
    { title: 'Order #', dataIndex: 'orderNumber', render: val => val || '-' },
    { title: 'Gross Amt', dataIndex: 'grossAmount', render: val => <span className="font-medium">{formatCurrency(val)}</span> },
    { title: 'Platform Fee', dataIndex: 'platformFee', render: val => <span className="text-red-500 font-medium">-{formatCurrency(val)}</span> },
    { title: 'Net Amount', dataIndex: 'netAmount', render: val => <span className="text-emerald-600 font-bold">{formatCurrency(val)}</span> },
    { title: 'Status', dataIndex: 'settlementStatus', render: val => <Tag color={val === 'settled' ? 'green' : 'orange'}>{val?.toUpperCase()}</Tag> }
  ];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payments & Settlements</h1>
          <p className="text-sm text-slate-500 mt-1">Track your revenue, fees, and payouts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(1250000)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Settled</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(980000)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Pending Payout</p>
          <h3 className="text-2xl font-bold text-orange-500 mt-2">{formatCurrency(45000)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Platform Fees</p>
          <h3 className="text-2xl font-bold text-red-500 mt-2">-{formatCurrency(150000)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-emerald-500 bg-emerald-50/50">
          <p className="text-emerald-800 text-sm font-medium">Net Earnings</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(1055000)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Overview" key="1">
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Activity className="mr-2" /> Revenue Chart Coming Soon
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {['Fifozone', 'Amazon', 'Flipkart'].map(p => (
                <div key={p} className="p-4 border border-slate-200 rounded-xl">
                  <h4 className="font-bold mb-4">{p}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">This Month</span><span className="font-medium">{formatCurrency(150000)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Pending</span><span className="font-medium text-orange-500">{formatCurrency(12000)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Fees</span><span className="font-medium text-red-500">-{formatCurrency(15000)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Transaction History" key="2">
            <div className="flex justify-between mb-4">
              <div className="flex gap-2">
                <Select defaultValue="All" style={{ width: 120 }}><Option value="All">All Platforms</Option></Select>
                <Select defaultValue="All" style={{ width: 120 }}><Option value="All">All Types</Option></Select>
                <RangePicker />
              </div>
              <Button icon={<Download size={16} />}>Export CSV</Button>
            </div>
            <Table columns={columns} dataSource={transactions} rowKey="_id" loading={loading} pagination={{ pageSize: 15 }} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Fee Breakdown" key="3">
            <div className="p-10 text-center text-slate-500">Select a platform to view detailed fee structure breakdown.</div>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default PaymentsPage;
