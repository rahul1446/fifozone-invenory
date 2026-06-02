import React, { useState, useEffect } from 'react';
import { Alert, Progress, Table, Tooltip, Tag, Spin } from 'antd';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { getHealthOverviewApi, getAmazonHealthApi, getFlipkartHealthApi, getListingQualityApi } from '../../api/accountHealthApi';

const AccountHealthPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [amazonHealth, setAmazonHealth] = useState(null);
  const [flipkartHealth, setFlipkartHealth] = useState(null);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, amazonRes, flipkartRes, listingsRes] = await Promise.all([
          getHealthOverviewApi().catch(() => ({ data: { data: null } })),
          getAmazonHealthApi().catch(() => ({ data: { data: null } })),
          getFlipkartHealthApi().catch(() => ({ data: { data: null } })),
          getListingQualityApi().catch(() => ({ data: { data: [] } }))
        ]);

        setOverview(overviewRes.data?.data || overviewRes.data);
        setAmazonHealth(amazonRes.data?.data || amazonRes.data);
        setFlipkartHealth(flipkartRes.data?.data || flipkartRes.data);
        const fetchedListings = listingsRes.data?.data || listingsRes.data || [];
        setListings(Array.isArray(fetchedListings) ? fetchedListings : []);
      } catch (e) {
        console.error('Failed to fetch account health', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !overview) {
    return <div className="p-10 flex justify-center"><Spin size="large" /></div>;
  }

  const isAmazonAtRisk = amazonHealth?.metrics?.lateShipmentRate?.value > 4;

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {isAmazonAtRisk && (
        <Alert message="Critical Alert: Amazon Late Shipment Rate exceeds 4% threshold." type="error" showIcon closable />
      )}
      
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Account Health</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor your performance metrics across all platforms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Amazon */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-t-orange-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Amazon</h3>
            <Tag color={amazonHealth?.overallStatus === 'good' ? 'green' : 'red'} className="m-0 font-bold">
              {amazonHealth?.overallStatus === 'good' ? 'HEALTHY' : 'AT RISK'}
            </Tag>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Order Defect Rate (&lt;1%)</span>
                <span className={`font-bold ${amazonHealth?.metrics?.orderDefectRate?.value < 1 ? 'text-green-600' : 'text-red-500'}`}>
                  {amazonHealth?.metrics?.orderDefectRate?.value || 0}%
                </span>
              </div>
              <Progress percent={Math.min((amazonHealth?.metrics?.orderDefectRate?.value || 0) * 100, 100)} showInfo={false} strokeColor={amazonHealth?.metrics?.orderDefectRate?.value < 1 ? "#10b981" : "#ef4444"} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Late Shipment Rate (&lt;4%)</span>
                <span className={`font-bold ${amazonHealth?.metrics?.lateShipmentRate?.value < 4 ? 'text-green-600' : 'text-red-500'}`}>
                  {amazonHealth?.metrics?.lateShipmentRate?.value || 0}%
                </span>
              </div>
              <Progress percent={Math.min((amazonHealth?.metrics?.lateShipmentRate?.value || 0) * 25, 100)} showInfo={false} strokeColor={amazonHealth?.metrics?.lateShipmentRate?.value < 4 ? "#10b981" : "#ef4444"} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Valid Tracking Rate (&gt;95%)</span>
                <span className={`font-bold ${amazonHealth?.metrics?.validTrackingRate?.value >= 95 ? 'text-green-600' : 'text-red-500'}`}>
                  {amazonHealth?.metrics?.validTrackingRate?.value || 0}%
                </span>
              </div>
              <Progress percent={amazonHealth?.metrics?.validTrackingRate?.value || 0} showInfo={false} strokeColor={amazonHealth?.metrics?.validTrackingRate?.value >= 95 ? "#10b981" : "#ef4444"} />
            </div>
          </div>
        </div>

        {/* Flipkart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-t-blue-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Flipkart</h3>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-600">{flipkartHealth?.metrics?.sellerScore?.value || 0}</span><span className="text-slate-400">/100</span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-2 bg-slate-50 rounded"><span className="text-slate-600">Seller Tier</span><span className="font-bold text-blue-600">{flipkartHealth?.sellerTier || 'N/A'}</span></div>
            <div className="flex justify-between p-2 bg-slate-50 rounded"><span className="text-slate-600">Cancellation Rate</span><span className={`font-bold ${flipkartHealth?.metrics?.cancellationRate?.value < 1.5 ? 'text-green-600' : 'text-red-500'}`}>{flipkartHealth?.metrics?.cancellationRate?.value || 0}%</span></div>
            <div className="flex justify-between p-2 bg-slate-50 rounded"><span className="text-slate-600">Late Dispatch</span><span className={`font-bold ${flipkartHealth?.metrics?.lateDispatchRate?.value < 3 ? 'text-green-600' : 'text-red-500'}`}>{flipkartHealth?.metrics?.lateDispatchRate?.value || 0}%</span></div>
          </div>
        </div>

        {/* Fifozone */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-t-emerald-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Fifozone Native</h3>
            <Tag color={overview?.fifozone?.status === 'good' ? 'green' : 'orange'} className="m-0 font-bold">
              {overview?.fifozone?.status === 'good' ? 'EXCELLENT' : 'NEEDS ATTENTION'}
            </Tag>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> <span className="text-sm">Late Shipment Rate</span></div>
              <span className="font-bold text-emerald-600">{overview?.fifozone?.lateShipmentRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> <span className="text-sm">Return Rate</span></div>
              <span className="font-bold text-emerald-600">{overview?.fifozone?.returnRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> <span className="text-sm">Avg Customer Rating</span></div>
              <span className="font-bold text-emerald-600">{overview?.fifozone?.averageRating || 0}/5.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
        <h3 className="font-bold text-lg mb-4">Listing Quality Score</h3>
        <Table 
          dataSource={listings} 
          rowKey="id" 
          pagination={false}
          columns={[
            { title: 'Product', dataIndex: 'name', render: val => <span className="font-medium">{val}</span> },
            { title: 'Completeness', dataIndex: 'score', render: val => <Progress percent={val} size="small" status={val < 50 ? 'exception' : 'normal'} strokeColor={val > 80 ? '#10b981' : val > 50 ? '#f59e0b' : '#ef4444'} /> },
            { title: 'Missing Fields', dataIndex: 'missingFields', render: val => <span className="text-red-500 text-xs">{val && val.length > 0 ? val.join(', ') : 'None'}</span> },
            { title: 'Score', dataIndex: 'score', render: val => <Tag color={val > 80 ? 'green' : val > 50 ? 'orange' : 'red'}>{val}/100</Tag> }
          ]} 
        />
      </div>
    </div>
  );
};

export default AccountHealthPage;
