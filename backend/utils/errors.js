'use strict';
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { asyncHandler, errorHandler };
