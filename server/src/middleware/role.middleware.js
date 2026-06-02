const ApiError = require('../utils/ApiError');

const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Access denied. Role '${req.user.role}' is unauthorized`));
    }

    next();
  };
};

module.exports = { requireRole };
