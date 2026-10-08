import { NextResponse } from "next/server";
import { readAuthState } from "../../../lib/auth-state";
import { getRequestUser, isAdminUser } from "../../../lib/access-control";
import { safeErrorResponse } from "../../../lib/security";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });

    const state = await readAuthState();
    const artisans = state.users
      .filter((entry) => !isAdminUser(entry))
      .map(({ id, nama, email }) => ({ id, nama, email }));
    return NextResponse.json({ success: true, artisans });
  } catch (error) {
    return safeErrorResponse(error, "Gagal mengambil daftar akun pengrajin.");
  }
}
