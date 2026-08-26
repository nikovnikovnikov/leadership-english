import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Only run on routes that need session management.
     * Exclude public/static routes to avoid unnecessary Supabase auth calls.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/manifest|api/robots|api/manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
