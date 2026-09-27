export const defaultPaymentProvider = "klikqris";

export const paymentProviders = [
  { id: "klikqris", label: "KlikQRIS (QRIS Dinamis)", envKey: "KLIKQRIS_API_KEY" }
];

export function isPaymentProviderConfigured(provider, env = process.env) {
  return Boolean(env[paymentProviders.find((item) => item.id === provider)?.envKey ?? "KLIKQRIS_API_KEY"]);
}
