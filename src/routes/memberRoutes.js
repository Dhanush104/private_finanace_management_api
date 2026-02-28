const router = require('express').Router();
const { getAllMembers, getMember, createMember, updateMember, resetPassword, deleteMember } = require('../controllers/memberController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { createMemberSchema, updateMemberSchema, resetPasswordSchema } = require('../utils/validators');

router.use(protect);

router.get('/', authorize('admin'), getAllMembers);
router.post('/', authorize('admin'), validate(createMemberSchema), createMember);
router.get('/:id', getMember);
router.put('/:id', authorize('admin'), validate(updateMemberSchema), updateMember);
router.put('/:id/password', authorize('admin'), validate(resetPasswordSchema), resetPassword);
router.delete('/:id', authorize('admin'), deleteMember);

module.exports = router;
