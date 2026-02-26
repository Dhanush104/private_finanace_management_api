const router = require('express').Router();
const { getGroupConfig, updateGroupConfig } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { groupConfigSchema, addFundsSchema } = require('../utils/validators');

router.use(protect);
router.get('/', getGroupConfig);
router.put('/', authorize('admin'), validate(groupConfigSchema), updateGroupConfig);
router.post('/add-funds', authorize('admin'), validate(addFundsSchema), require('../controllers/groupController').addFunds);

module.exports = router;
