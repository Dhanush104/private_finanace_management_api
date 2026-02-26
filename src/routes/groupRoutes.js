const router = require('express').Router();
const { getGroupConfig, updateGroupConfig } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { groupConfigSchema } = require('../utils/validators');

router.use(protect);
router.get('/', getGroupConfig);
router.put('/', authorize('admin'), validate(groupConfigSchema), updateGroupConfig);

module.exports = router;
