import type { Department, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface TriageRule {
  condition: string;
  priority: string;
}

export interface WorkflowData {
  department: Department;
  intakeSteps: string[];
  triageRules: TriageRule[];
  escalationPath: string;
}

const ALL_DEPARTMENTS: Department[] = ["RADIOLOGY", "OPD", "CARDIOLOGY", "EMERGENCY"];

export async function getAllWorkflows(): Promise<WorkflowData[]> {
  const rows = await prisma.departmentWorkflow.findMany();
  const byDept = new Map(rows.map((r) => [r.department, r]));

  return ALL_DEPARTMENTS.map((department) => {
    const row = byDept.get(department);
    return {
      department,
      intakeSteps: (row?.intakeSteps as string[] | undefined) ?? [],
      triageRules: (row?.triageRules as unknown as TriageRule[] | undefined) ?? [],
      escalationPath: (row?.escalationPath as string | undefined) ?? "",
    };
  });
}

export function upsertWorkflow(data: WorkflowData) {
  const triageRules = data.triageRules as unknown as Prisma.InputJsonValue;

  return prisma.departmentWorkflow.upsert({
    where: { department: data.department },
    create: {
      department: data.department,
      intakeSteps: data.intakeSteps,
      triageRules,
      escalationPath: data.escalationPath,
    },
    update: {
      intakeSteps: data.intakeSteps,
      triageRules,
      escalationPath: data.escalationPath,
    },
  });
}
