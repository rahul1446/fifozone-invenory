import dayjs from 'dayjs';

// Format currency to INR (₹)
export const formatCurrency = (amount) => {
  const value = parseFloat(amount);
  if (isNaN(value)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

// Format dates
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format('DD MMM YYYY, hh:mm A');
};

// Relative relative time string helper
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  const diffInMinutes = dayjs().diff(dayjs(dateStr), 'minute');
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  
  const diffInHours = dayjs().diff(dayjs(dateStr), 'hour');
  if (diffInHours < 24) return `${diffInHours} hrs ago`;
  
  return dayjs(dateStr).format('DD MMM YYYY');
};
