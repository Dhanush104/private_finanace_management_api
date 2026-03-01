const router = require('express').Router();
<<<<<<< HEAD
const { getContributions, recordContribution, updateContribution, approveContribution, rejectContribution } = require('../controllers/contributionController');
=======
const { getContributions, recordContribution, updateContribution } = require('../controllers/contributionController');
>>>>>>> main
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { contributionSchema, updateContributionSchema } = require('../utils/validators');

router.use(protect);
router.get('/', getContributions);
router.post('/', validate(contributionSchema), recordContribution);
router.put('/:id', authorize('admin'), validate(updateContributionSchema), updateContribution);
<<<<<<< HEAD
router.post('/:id/approve', authorize('admin'), approveContribution);
router.post('/:id/reject', authorize('admin'), rejectContribution);
=======
>>>>>>> main

module.exports = router;
