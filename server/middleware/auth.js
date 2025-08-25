export const authMiddleware = (req, res, next) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return next();
  }
  const headerKey = req.header('x-api-key');
  if (headerKey && headerKey === apiKey) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
};
