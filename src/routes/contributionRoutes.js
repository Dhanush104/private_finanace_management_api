const router = require('express').Router();
const { getContributions, recordContribution, updateContribution, approveContribution, rejectContribution } = require('../controllers/contributionController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { contributionSchema, updateContributionSchema } = require('../utils/validators');

router.use(protect);
router.get('/', getContributions);
router.post('/', validate(contributionSchema), recordContribution);
router.put('/:id', authorize('admin'), validate(updateContributionSchema), updateContribution);

router.post('/:id/approve', authorize('admin'), approveContribution);
router.post('/:id/reject', authorize('admin'), rejectContribution);


module.exports = router;
