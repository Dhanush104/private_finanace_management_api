const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
    });

    if (!result.success) {
        const message = result.error.errors
            .map(e => `${e.path.slice(1).join('.')}: ${e.message}`)
            .join('; ');
        return next(new AppError(`Validation error: ${message}`, 400));
    }

    req.validated = result.data;
    next();
};

module.exports = { validate };
