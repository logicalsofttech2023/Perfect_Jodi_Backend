const roleMiddleware = (roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ msg: "Access denied. Admins only." });
      }
      next();
    };
  };
  
  export default roleMiddleware;
  