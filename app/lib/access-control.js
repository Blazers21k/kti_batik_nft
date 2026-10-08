import { getSessionUser } from "./auth";

export async function getRequestUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;
  return getSessionUser(token);
}

export function isAdminUser(user) {
  if (!user?.email) return false;
  const adminEmails = (process.env.NBC_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(user.email.trim().toLowerCase());
}
