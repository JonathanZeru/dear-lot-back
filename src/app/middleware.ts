import { NextResponse } from "next/server";

export function middleware(req: { headers: { get: (arg0: string) => any; }; }) {
  const token = req.headers.get("authorization");
  if (!token) return NextResponse.redirect("/DearLottery");

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
