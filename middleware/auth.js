const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized - Please login first" });
};

export default {
  isAuthenticated
}; 