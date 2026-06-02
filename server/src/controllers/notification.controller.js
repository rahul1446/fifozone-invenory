const Notification = require('../models/Notification.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const query = {};

  if (type && type !== 'All') {
    if (type === 'Low Stock') {
      query.type = { $in: ['low_stock', 'out_of_stock'] };
    } else if (type === 'Orders') {
      query.type = { $in: ['new_order', 'order_cancelled'] };
    } else if (type === 'Alerts') {
      query.type = { $in: ['sync_failed', 'dead_product_flagged'] };
    } else {
      query.type = type.toLowerCase();
    }
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Notification.countDocuments(query);
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Unread count specifically for the logged-in user
  const unreadCount = await Notification.countDocuments({
    readBy: { $ne: req.user._id }
  });

  res.status(200).json(
    new ApiResponse(200, {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Notifications retrieved successfully')
  );
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Notification.findByIdAndUpdate(id, {
    $addToSet: { readBy: req.user._id }
  });

  res.status(200).json(new ApiResponse(200, null, 'Notification marked as read'));
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
