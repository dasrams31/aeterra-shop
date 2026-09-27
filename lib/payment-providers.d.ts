export const defaultPaymentProvider: "klikqris";
export const paymentProviders: Array<{ id: "klikqris"; label: string; envKey: string }>;
export function isPaymentProviderConfigured(provider: string, env?: NodeJS.ProcessEnv): boolean;
