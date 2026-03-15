import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { checkIfAdmin } from "@/lib/auth/admin-check";

/**
 * Require admin access
 * - Redirects to sign-in if not authenticated
 * - Redirects to home if not admin
 */
export async function requireAdmin(redirectTo?: string) {
  const headersList = await headers();
  const payload = await getPayload({ config });
  
  try {
    const session = await payload.auth({ headers: headersList });

    if (!session.user) {
      const redirectUrl = redirectTo 
        ? `/sign-in?redirect=${encodeURIComponent(redirectTo)}`
        : "/sign-in";
      redirect(redirectUrl);
    }

    if (!checkIfAdmin(session.user)) {
      redirect("/");
    }

    return {
      user: session.user,
    };
  } catch (error) {
    console.error("Admin auth error:", error);
    redirect("/sign-in");
  }
}
