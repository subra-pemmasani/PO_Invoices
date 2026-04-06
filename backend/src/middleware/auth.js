const permissions = {
  ADMIN: ['read', 'write', 'approve', 'export'],
  APPROVER: ['read', 'approve', 'export'],
  VIEWER: ['read']
};

export function mockAuth(req, _res, next) {
  const role = req.header('x-role') || 'VIEWER';
  const userId = req.header('x-user-id') || null;
  req.user = { role, userId };
  next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const allowed = permissions[req.user?.role] || [];
    if (!allowed.includes(permission)) {
      return res.status(403).json({ error: `Role ${req.user?.role ?? 'UNKNOWN'} cannot ${permission}` });
    }
    return next();
  };
}
