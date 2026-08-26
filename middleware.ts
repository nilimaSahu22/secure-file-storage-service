import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/dashboard") && (!session || session.user.type !== "staff")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    pathname.startsWith("/portal") &&
    pathname !== "/portal/login" &&
    (!session || session.user.type !== "patient")
  ) {
    return NextResponse.redirect(new URL("/portal/login", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*"],
  runtime: "nodejs",
};
