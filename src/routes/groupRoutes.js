const router = require('express').Router();

const { getGroupConfig, updateGroupConfig, updateAnnouncement } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { groupConfigSchema, addFundsSchema, debitFundsSchema, announcementSchema } = require('../utils/validators');


router.use(protect);
router.get('/', getGroupConfig);
router.put('/', authorize('admin'), validate(groupConfigSchema), updateGroupConfig);

router.put('/announcement', authorize('admin'), validate(announcementSchema), updateAnnouncement);
router.post('/add-funds', authorize('admin'), validate(addFundsSchema), require('../controllers/groupController').addFunds);
router.post('/debit-funds', authorize('admin'), validate(debitFundsSchema), require('../controllers/groupController').debitFunds);


module.exports = router;
