import React, { useState, useEffect } from 'react';
import { Alert, Tabs, Table, Tag, Button, Spin, message } from 'antd';
import { Megaphone, Activity, Play, Pause } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { getAdOverviewApi, getAmazonCampaignsApi, getFlipkartCampaignsApi, pauseAmazonCampaignApi, activateAmazonCampaignApi, pauseFlipkartCampaignApi, activateFlipkartCampaignApi } from '../../api/advertisingApi';

const AdvertisingPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [amazonCampaigns, setAmazonCampaigns] = useState([]);
  const [flipkartCampaigns, setFlipkartCampaigns] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, amazonRes, flipkartRes] = await Promise.all([
        getAdOverviewApi().catch(() => ({ data: { data: null } })),
        getAmazonCampaignsApi().catch(() => ({ data: { data: [] } })),
        getFlipkartCampaignsApi().catch(() => ({ data: { data: [] } }))
      ]);

      setOverview(overviewRes.data?.data || overviewRes.data);
      setAmazonCampaigns(amazonRes.data?.data || amazonRes.data || []);
      setFlipkartCampaigns(flipkartRes.data?.data || flipkartRes.data || []);
    } catch (error) {
      console.error('Failed to fetch ads data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (id, currentStatus, platform) => {
    try {
      if (platform === 'amazon') {
        currentStatus === 'active' ? await pauseAmazonCampaignApi(id) : await activateAmazonCampaignApi(id);
      } else {
        currentStatus === 'active' ? await pauseFlipkartCampaignApi(id) : await activateFlipkartCampaignApi(id);
      }
      message.success(`Campaign ${currentStatus === 'active' ? 'paused' : 'activated'}`);
      fetchData(); // Refresh data
    } catch (error) {
      message.error('Failed to update campaign status');
    }
  };

  const columns = (platform) => [
    { title: 'Campaign Name', dataIndex: 'name', render: val => <span className="font-bold text-blue-600">{val}</span> },
    { title: 'Type', dataIndex: 'type', render: val => <Tag>{val?.replace('_', ' ').toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'status', render: val => <Tag color={val === 'active' ? 'green' : 'orange'}>{val?.toUpperCase()}</Tag> },
    { title: 'Daily Budget', dataIndex: 'dailyBudget', render: val => formatCurrency(val) },
    { title: 'Spend (MTD)', dataIndex: 'spendThisMonth', render: val => <span className="font-medium text-slate-700">{formatCurrency(val)}</span> },
    { title: 'Clicks', dataIndex: 'clicks' },
    { title: 'Orders', dataIndex: 'orders' },
    { title: 'Revenue', dataIndex: 'revenue', render: val => <span className="font-bold text-emerald-600">{formatCurrency(val)}</span> },
    { title: 'ROAS', dataIndex: 'roas', render: val => `${val}x` },
    { title: 'Actions', render: (_, r) => r.status === 'active' ? 
      <Button size="small" onClick={() => handleToggleStatus(r._id, r.status, platform)} icon={<Pause size={14}/>}>Pause</Button> : 
      <Button size="small" onClick={() => handleToggleStatus(r._id, r.status, platform)} icon={<Play size={14}/>} type="primary" className="bg-emerald-600">Activate</Button> 
    }
  ];

  if (loading || !overview) {
    return <div className="p-10 flex justify-center"><Spin size="large" /></div>;
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <Alert message="Campaign creation must be done on Amazon/Flipkart directly. You can view performance and pause/activate campaigns here." type="info" showIcon className="bg-blue-50 border-blue-200" />
      
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Advertising Console</h1>
          <p className="text-sm text-slate-500 mt-1">Manage cross-platform ad campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Total Spend</p>
          <h3 className="text-2xl font-bold text-red-500 mt-2">{formatCurrency(overview?.totalSpend || 0)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Ad Revenue</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(overview?.totalRevenue || 0)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500">
          <p className="text-slate-500 text-sm font-medium">Overall ROAS</p>
          <h3 className="text-2xl font-bold text-blue-600 mt-2">{overview?.overallRoas || 0}x</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Active Campaigns</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">{overview?.activeCampaigns || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Paused</p>
          <h3 className="text-2xl font-bold text-slate-500 mt-2">{overview?.pausedCampaigns || 0}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Amazon Ads" key="1">
            <div className="h-64 mb-6 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Activity className="mr-2" /> Performance Chart Coming Soon
            </div>
            <Table columns={columns('amazon')} dataSource={amazonCampaigns} rowKey="_id" pagination={false} scroll={{ x: 1000 }} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Flipkart Ads" key="2">
            <Table columns={columns('flipkart')} dataSource={flipkartCampaigns} rowKey="_id" pagination={false} scroll={{ x: 1000 }} />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvertisingPage;
