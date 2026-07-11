import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    } else if (req.cookies && req.cookies.session) {
      token = req.cookies.session;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded; // { uid, email, role, ... }

    // Check if user is banned
    const user = await User.findById(decoded.uid).lean();
    if (user && user.isBanned) {
      return res.status(403).json({ success: false, message: 'Account has been banned' });
    }

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token', error: error.message });
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};
