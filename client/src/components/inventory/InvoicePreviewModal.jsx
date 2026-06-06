import React from 'react';
import { Modal, Descriptions, Table, Tag, Typography, Divider } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const InvoicePreviewModal = ({ open, invoice, onClose }) => {
  if (!invoice) return null;

  const columns = [
    { title: 'Product Name', dataIndex: 'productName', key: 'productName' },
    { title: 'Batch', dataIndex: 'batchNo', key: 'batchNo', render: v => v || '-' },
    { title: 'Expiry', dataIndex: 'expiryDate', key: 'expiry', render: v => v ? dayjs(v).format('MMM YYYY') : '-' },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'right' },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', align: 'right', render: v => `₹${v?.toLocaleString('en-IN')}` },
    { title: 'Discount', dataIndex: 'discount', key: 'discount', align: 'right', render: v => `₹${v?.toLocaleString('en-IN') || 0}` },
    { title: 'GST %', dataIndex: 'gstRate', key: 'gstRate', align: 'right', render: v => `${v || 0}%` },
    { 
      title: 'Net Amount', 
      key: 'net', 
      align: 'right',
      render: (_, r) => {
        const taxable = (r.qty * r.rate) - (r.discount || 0);
        const tax = taxable * ((r.gstRate || 0) / 100);
        return <Text strong>₹{(taxable + tax).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>;
      }
    }
  ];

  return (
    <Modal
      title={<span className="text-lg font-bold">Invoice Preview: {invoice.invoiceNo}</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Supplier</div>
            <div className="text-xl font-bold text-slate-800">{invoice.supplier}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Status</div>
            <Tag color={invoice.status === 'Posted' ? 'green' : invoice.status === 'Draft' ? 'orange' : 'default'} className="!m-0 text-sm px-3 py-1">
              {invoice.status}
            </Tag>
          </div>
        </div>

        <Divider className="!my-2" />

        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered className="bg-slate-50">
          <Descriptions.Item label="Invoice Date">{invoice.invoiceDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="GST Invoice No.">{invoice.gstInvoiceNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="Place of Supply">{invoice.placeOfSupply || '-'}</Descriptions.Item>
          
          <Descriptions.Item label="Transport Mode">{invoice.transportMode || '-'}</Descriptions.Item>
          <Descriptions.Item label="Vehicle / LR No.">{invoice.vehicleNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="E-Way Bill">{invoice.ewayBillNo || '-'}</Descriptions.Item>
          
          <Descriptions.Item label="Insurance Policy">{invoice.transitInsurance || '-'}</Descriptions.Item>
          <Descriptions.Item label="Reverse Charge">{invoice.reverseCharge}</Descriptions.Item>
        </Descriptions>

        <div className="mt-6">
          <div className="font-semibold text-slate-700 mb-2">Line Items</div>
          <Table 
            columns={columns} 
            dataSource={invoice.items || []} 
            rowKey={(r, i) => i} 
            pagination={false} 
            size="small"
            bordered
          />
        </div>

        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Net Taxable:</span>
              <span>₹{invoice.netTaxableValue?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total IGST:</span>
              <span>₹{invoice.totalIgst?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Discount:</span>
              <span className="text-red-500">-₹{invoice.totalDiscount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Rounding Off:</span>
              <span>₹{invoice.roundingOff?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <Divider className="!my-1" />
            <div className="flex justify-between text-lg font-bold text-slate-800">
              <span>Grand Total:</span>
              <span>₹{invoice.grandTotal?.toLocaleString('en-IN')}</span>
            </div>
            {invoice.amountInWords && (
              <div className="text-right text-xs text-slate-400 italic">
                {invoice.amountInWords}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InvoicePreviewModal;
