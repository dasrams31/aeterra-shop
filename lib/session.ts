export const SESSION_COOKIE = "aeternum_session";

export type SessionPayload = {
  userId: number | string;
  role: string;
  exp: number;
};
