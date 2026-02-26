const AppError = require('../utils/AppError');

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('Access denied: insufficient permissions', 403));
        }
        next();
    };
};

module.exports = { authorize };
