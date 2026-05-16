import { cookies as getCookies } from "next/headers";

interface Props {
  prefix: string;
  value: string;
}

interface ClearProps {
  prefix: string;
}

/** Only set `domain` when non-empty — `domain: ""` breaks browsers and drops the cookie. */
function productionCookieExtras() {
  if (process.env.NODE_ENV === "development") return {};
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  return {
    sameSite: "none" as const,
    secure: true,
    ...(domain ? { domain } : {}),
  };
}

export const generateAuthCookie = async ({
  prefix,
  value,
}: Props) => {
  const cookies = await getCookies();

  cookies.set({
    name: `${prefix}-token`,
    value,
    httpOnly: true,
    path: "/",
    ...productionCookieExtras(),
  });
};

export const clearAuthCookie = async ({
  prefix,
}: ClearProps) => {
  const cookies = await getCookies();

  const domain =
    process.env.NODE_ENV !== "development"
      ? process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim()
      : undefined;

  cookies.delete({
    name: `${prefix}-token`,
    path: "/",
    ...(domain ? { domain } : {}),
  });
};
