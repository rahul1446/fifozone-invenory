import React, { useState } from 'react';
import { Card, Form, Input, Button, Switch, message } from 'antd';
import { User, Lock, Bell, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { changePasswordApi } from '../../api/authApi';
import { formatRelativeTime } from '../../utils/formatters';

const ProfilePage = () => {
  const { user } = useAuth();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("New passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await changePasswordApi(values.oldPassword, values.newPassword);
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <Card title={<><User size={18} className="inline mr-2 text-slate-500"/> Personal Information</>} className="shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
              <p className="text-slate-500">{user.role.toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="font-medium text-slate-800 mt-1">{user.email}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</label>
              <div className="font-medium text-slate-800 mt-1">{user.phone || 'Not provided'}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Status</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="font-medium text-emerald-700">Active</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Login</label>
              <div className="font-medium text-slate-800 mt-1">{formatRelativeTime(user.lastLogin)}</div>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card title={<><Lock size={18} className="inline mr-2 text-slate-500"/> Change Password</>} className="shadow-sm rounded-xl border-slate-200">
          <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
            <Form.Item label="Current Password" name="oldPassword" rules={[{ required: true, message: 'Please enter current password' }]}>
              <Input.Password size="large" />
            </Form.Item>
            
            <Form.Item label="New Password" name="newPassword" rules={[{ required: true, message: 'Please enter new password', min: 6 }]}>
              <Input.Password size="large" />
            </Form.Item>
            
            <Form.Item label="Confirm New Password" name="confirmPassword" rules={[{ required: true, message: 'Please confirm new password' }]}>
              <Input.Password size="large" />
            </Form.Item>
            
            <div className="flex justify-end mt-6">
              <Button type="primary" htmlType="submit" loading={loading} icon={<Save size={16} />} size="large" className="bg-emerald-600 hover:bg-emerald-500">
                Update Password
              </Button>
            </div>
          </Form>
        </Card>
      </div>

      {/* Notifications */}
      <Card title={<><Bell size={18} className="inline mr-2 text-slate-500"/> Notification Preferences</>} className="shadow-sm rounded-xl border-slate-200">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <h4 className="font-semibold text-slate-800">Email Alerts</h4>
              <p className="text-sm text-slate-500">Receive daily summaries and critical alerts via email</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <h4 className="font-semibold text-slate-800">WhatsApp Notifications</h4>
              <p className="text-sm text-slate-500">Instant alerts for new orders and low stock</p>
            </div>
            <Switch defaultChecked={false} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
