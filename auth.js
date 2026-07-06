function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ erro: 'Não autenticado' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  return res.status(403).json({ erro: 'Acesso restrito ao administrador' });
}

module.exports = { requireAuth, requireAdmin };
