const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('Async Handler Error:', error);
    next(error);
  });
};

module.exports = asyncHandler;