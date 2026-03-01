const router = require('express').Router();
<<<<<<< HEAD
const { getGroupConfig, updateGroupConfig, updateAnnouncement } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { groupConfigSchema, addFundsSchema, debitFundsSchema, announcementSchema } = require('../utils/validators');
=======
const { getGroupConfig, updateGroupConfig } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { groupConfigSchema } = require('../utils/validators');
>>>>>>> main

router.use(protect);
router.get('/', getGroupConfig);
router.put('/', authorize('admin'), validate(groupConfigSchema), updateGroupConfig);
<<<<<<< HEAD
router.put('/announcement', authorize('admin'), validate(announcementSchema), updateAnnouncement);
router.post('/add-funds', authorize('admin'), validate(addFundsSchema), require('../controllers/groupController').addFunds);
router.post('/debit-funds', authorize('admin'), validate(debitFundsSchema), require('../controllers/groupController').debitFunds);
=======
>>>>>>> main

module.exports = router;
