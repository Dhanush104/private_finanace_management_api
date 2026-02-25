const router = require('express').Router();
const { getAdminDashboard, getMemberDashboard, getMonthlyReport, getYearlyReport, getGroupReport } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);
router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/member', getMemberDashboard);
router.get('/report/monthly', authorize('admin'), getMonthlyReport);
router.get('/report/yearly', authorize('admin'), getYearlyReport);
router.get('/report/group', authorize('admin'), getGroupReport);

module.exports = router;
