module.exports = (err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Error interno del servidor' });
};
