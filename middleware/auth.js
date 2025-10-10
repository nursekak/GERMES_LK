const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware для проверки JWT токена
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Токен доступа не предоставлен' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Пользователь не найден или неактивен' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Недействительный токен' });
  }
};

// Middleware для проверки роли
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Пользователь не аутентифицирован' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Недостаточно прав доступа' });
    }

    next();
  };
};

// Middleware для проверки, что пользователь может управлять только своими данными
const requireOwnershipOrManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Пользователь не аутентифицирован' });
  }

  const targetUserId = req.params.userId || req.params.id;
  
  if (req.user.role === 'manager' || req.user.id === targetUserId) {
    next();
  } else {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnershipOrManager
};
