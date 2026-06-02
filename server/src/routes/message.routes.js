const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/message.controller');

router.use(requireAuth);

router.get('/', ctrl.getMessages);
router.get('/templates', ctrl.getTemplates);
router.post('/templates', ctrl.createTemplate);
router.patch('/templates/:id', ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);
router.get('/:id', ctrl.getMessageThread);
router.post('/:id/reply', ctrl.replyToMessage);
router.patch('/:id/read', ctrl.markAsRead);
router.patch('/:id/close', ctrl.closeThread);

module.exports = router;
