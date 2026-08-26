import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientById } from "@/lib/services/patients";
import { getStaffUsers } from "@/lib/services/staff";
import { filterFilesForStaff } from "@/lib/services/files";
import { UnifiedChartView } from "@/components/chart/UnifiedChartView";

export const dynamic = "force-dynamic";

export default async function PatientChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, patient, staff] = await Promise.all([auth(), getPatientById(id), getStaffUsers()]);

  if (!patient) {
    notFound();
  }

  const currentStaffDepartment = session?.user.department ?? null;
  const visibleFiles =
    session?.user.role && session.user.role !== "ADMIN"
      ? filterFilesForStaff(patient.files, {
          id: session.user.id,
          role: session.user.role,
          department: currentStaffDepartment,
        })
      : patient.files;

  return (
    <UnifiedChartView
      patient={{ ...patient, files: visibleFiles }}
      staff={staff}
      currentStaffDepartment={currentStaffDepartment}
    />
  );
}
