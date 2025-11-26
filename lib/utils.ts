import bcrypt from "bcryptjs";

export const hashPIN = async (pin: string) => {
  return await bcrypt.hash(pin, 10);
};

export const comparePIN = async (pin: string, hash: string) => {
  return await bcrypt.compare(pin, hash);
};
