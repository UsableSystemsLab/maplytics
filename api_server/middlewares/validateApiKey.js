const validateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header is missing" });
  }

  const [type, apiKey] = authHeader.split(" ");

  if (type !== "Bearer" || !apiKey) {
    return res.status(401).json({
      error:
        "Invalid authorization format. " +
        "Format is Authorization Bearer <API_KEY>",
    });
  }
  // TODO: Use firebase to verify apiKey
  if (apiKey !== process.env.API_SERVER_KEY) {
    console.log(apiKey, process.env.API_SERVER_KEY);
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};

export default validateApiKey;
