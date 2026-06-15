import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token missing" }, { status: 400 });
  }

  const res = NextResponse.json({ message: "Session stored" });

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days - allow cookie to persist; validation happens at backend
  });

  return res;
}
