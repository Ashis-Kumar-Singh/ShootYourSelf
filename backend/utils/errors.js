'use strict';

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, next) {
  const reqId = req.id || '-';
  console.error(`[${reqId}] Unhandled error:`, err.message, err.stack?.split('\n').slice(0, 3).join(' '));
  res.status(500).json({ error: 'Internal server error', reqId });
}

function logError(req, e, context) {
  const reqId = req.id || '-';
  console.error(`[${reqId}] ${context}:`, e.message);
}

function sendError(res, e, context, statusCode) {
  const reqId = res.req && res.req.id || '-';
  console.error(`[${reqId}] ${context}:`, e.message);
  res.status(statusCode || 500).json({
    error: context,
    detail: e.message,
    reqId,
  });
}

module.exports = { asyncHandler, errorHandler, logError, sendError };
