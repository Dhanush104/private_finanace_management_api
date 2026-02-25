const router = require('express').Router();
const { getLoans, getLoan, requestLoan, approveLoan, rejectLoan } = require('../controllers/loanController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { requestLoanSchema } = require('../utils/validators');

router.use(protect);
router.get('/', getLoans);
router.get('/:id', getLoan);
router.post('/', authorize('member'), validate(requestLoanSchema), requestLoan);
router.post('/:id/approve', authorize('admin'), approveLoan);
router.post('/:id/reject', authorize('admin'), rejectLoan);

module.exports = router;
