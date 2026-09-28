import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth";
import { redirectApp } from "@/lib/redirect";

export async function POST(request: Request) {
  const response = redirectApp("/", request);
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/"
  });
  return response;
}
