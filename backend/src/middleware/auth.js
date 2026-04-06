import { prisma } from '../prisma.js';

const permissions = {
  ADMIN: ['read', 'write', 'approve', 'export'],
  APPROVER: ['read', 'approve', 'export'],
  VIEWER: ['read']
};

export async function authenticateUser(req, res, next) {
  if (req.path === '/health' || req.method === 'OPTIONS') return next();

  const email = req.header('x-user-email');
  if (!email) {
    return res.status(401).json({ error: 'Missing x-user-email header' });
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user && process.env.ALLOW_BOOTSTRAP_ADMIN === 'true') {
    user = await prisma.user.create({
      data: { name: 'Bootstrap Admin', email, role: 'ADMIN' }
    });
  }

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
  return next();
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
