import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    if (req.tokenError) {
      return res.status(403).json({ success: false, message: "Invalid or expired token", error: req.tokenError.message });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Check if user is banned
    const user = await User.findById(req.user.uid).lean();
    if (user && user.isBanned) {
      return res.status(403).json({ success: false, message: "Account has been banned" });
    }

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid or expired token", error: error.message });
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (req.user.role !== role && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied: Insufficient permissions" });
    }
    next();
  };
};
