export const getStatus = (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
};
