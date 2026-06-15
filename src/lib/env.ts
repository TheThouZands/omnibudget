export const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }
};

export const requireEnv = (keys: string[], label = keys.join(" or ")) => {
  const value = readEnv(...keys);

  if (!value) {
    throw new Error(`${label} is not configured. Set one of: ${keys.join(", ")}`);
  }

  return value;
};
