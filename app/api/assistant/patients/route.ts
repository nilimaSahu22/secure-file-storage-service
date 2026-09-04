import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPatientBasic, searchPatients } from "@/lib/services/patients";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.type !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const p = await getPatientBasic(id);
    return NextResponse.json({ patient: p ? { id: p.id, name: `${p.firstName} ${p.lastName}` } : null });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const patients = await searchPatients(q);
  return NextResponse.json({
    patients: patients.slice(0, 20).map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      dob: p.dateOfBirth.toISOString().slice(0, 10),
    })),
  });
}
