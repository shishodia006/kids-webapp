import "server-only";

export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID ?? "",
  keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
};

export function getRazorpayKeyId() {
  if (!razorpayConfig.keyId) {
    throw new Error("RAZORPAY_KEY_ID is not configured.");
  }

  return razorpayConfig.keyId;
}

export function getRazorpayKeySecret() {
  if (!razorpayConfig.keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured.");
  }

  return razorpayConfig.keySecret;
}
