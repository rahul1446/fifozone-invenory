const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const Message = require('../models/Message.model');
const ReplyTemplate = require('../models/ReplyTemplate.model');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Generate mock messages if none exist
const seedMockMessages = async () => {
  const count = await Message.countDocuments();
  if (count > 0) return;

  const mockMessages = [
    {
      platform: 'amazon',
      customerName: 'Rahul Sharma',
      customerEmail: 'rahul.s@example.com',
      subject: 'Where is my order?',
      type: 'order_query',
      status: 'unread',
      threadMessages: [{ sender: 'customer', senderName: 'Rahul Sharma', body: 'Hi, I ordered 3 days ago but haven\'t received tracking details. Order #AMZ-9923', timestamp: new Date(Date.now() - 3600000) }]
    },
    {
      platform: 'flipkart',
      customerName: 'Priya Patel',
      subject: 'Damaged item received',
      type: 'return_query',
      status: 'unread',
      threadMessages: [{ sender: 'customer', senderName: 'Priya Patel', body: 'The Drools dog food bag was torn.', timestamp: new Date(Date.now() - 7200000) }]
    },
    {
      platform: 'fifozone',
      customerName: 'Amit Kumar',
      subject: 'Is this suitable for puppies?',
      type: 'product_question',
      productName: 'Royal Canin Maxi Puppy',
      status: 'replied',
      threadMessages: [
        { sender: 'customer', senderName: 'Amit Kumar', body: 'Can I give this to my 2 month old golden retriever?', timestamp: new Date(Date.now() - 86400000) },
        { sender: 'seller', senderName: 'Fifozone Support', body: 'Yes Amit, this is perfect for a 2-month-old Golden Retriever.', timestamp: new Date(Date.now() - 43200000) }
      ],
      repliedAt: new Date(Date.now() - 43200000)
    }
  ];

  // duplicate to make ~15 messages
  const toInsert = [];
  for (let i = 0; i < 5; i++) {
    mockMessages.forEach(m => {
      toInsert.push({ ...m, customerName: m.customerName + ' ' + i, receivedAt: new Date(Date.now() - (i * 3600000)) });
    });
  }

  await Message.insertMany(toInsert);
};

exports.getMessages = asyncHandler(async (req, res) => {
  await seedMockMessages();

  const { platform, status, type, search, page = 1, limit = 10 } = req.query;
  const query = {};
  if (platform) query.platform = platform;
  if (status) query.status = status;
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { orderNumber: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const messages = await Message.find(query).sort({ receivedAt: -1 }).skip(skip).limit(parseInt(limit));
  const total = await Message.countDocuments(query);

  res.status(200).json(new ApiResponse(200, { messages, total, page, limit }, 'Messages fetched'));
});

exports.getMessageThread = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid message ID');
  const message = await Message.findById(req.params.id);
  if (!message) throw new ApiError(404, 'Message not found');
  res.status(200).json(new ApiResponse(200, message, 'Message thread fetched'));
});

exports.replyToMessage = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) throw new ApiError(400, 'Reply body is required');
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid message ID — this appears to be a mock message. Replies to mock messages are handled client-side.');

  const message = await Message.findById(req.params.id);
  if (!message) throw new ApiError(404, 'Message not found');

  const reply = {
    sender: 'seller',
    senderName: req.user ? req.user.name : 'Support Team',
    body,
    timestamp: new Date()
  };

  message.threadMessages.push(reply);
  message.status = 'replied';
  message.repliedAt = new Date();
  
  if (message.platform === 'fifozone') {
    // Add real API logic here if WooCommerce supports message replies
    logger.info('Replied to fifozone message');
  } else {
    // Amazon/Flipkart mock API call
    logger.info(`Mock API call to reply on ${message.platform}`);
  }

  await message.save();
  res.status(200).json(new ApiResponse(200, message, 'Replied to message successfully'));
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const message = await Message.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true });
  if (!message) throw new ApiError(404, 'Message not found');
  res.status(200).json(new ApiResponse(200, message, 'Message marked as read'));
});

exports.closeThread = asyncHandler(async (req, res) => {
  const message = await Message.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
  if (!message) throw new ApiError(404, 'Message not found');
  res.status(200).json(new ApiResponse(200, message, 'Thread closed'));
});

exports.getTemplates = asyncHandler(async (req, res) => {
  const templates = await ReplyTemplate.find();
  res.status(200).json(new ApiResponse(200, templates, 'Templates fetched'));
});

exports.createTemplate = asyncHandler(async (req, res) => {
  const { title, body, platforms } = req.body;
  const template = await ReplyTemplate.create({ title, body, platforms, createdBy: req.user?._id });
  res.status(201).json(new ApiResponse(201, template, 'Template created'));
});

exports.updateTemplate = asyncHandler(async (req, res) => {
  const template = await ReplyTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!template) throw new ApiError(404, 'Template not found');
  res.status(200).json(new ApiResponse(200, template, 'Template updated'));
});

exports.deleteTemplate = asyncHandler(async (req, res) => {
  const template = await ReplyTemplate.findByIdAndDelete(req.params.id);
  if (!template) throw new ApiError(404, 'Template not found');
  res.status(200).json(new ApiResponse(200, {}, 'Template deleted'));
});
