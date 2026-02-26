const router = require('express').Router();
const { getRepayments, recordRepayment } = require('../controllers/repaymentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { repaymentSchema } = require('../utils/validators');

router.use(protect);
router.get('/', getRepayments);
router.post('/', authorize('admin'), validate(repaymentSchema), recordRepayment);

module.exports = router;
