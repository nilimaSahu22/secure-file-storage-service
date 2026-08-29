import type { Department, Role } from "@prisma/client";

// Pure access-control logic, deliberately kept free of AWS SDK / pdf-parse
// imports (see lib/services/files.ts) so pages that only need to filter an
// already-fetched file list don't drag those heavy dependencies into their
// server-render bundle.

export class FileAccessDeniedError extends Error {
  constructor() {
    super("Your department does not have access to this file.");
    this.name = "FileAccessDeniedError";
  }
}

export interface StaffAccessor {
  id: string;
  role: Role;
  department: Department | null;
}

// Files with no department set are unrestricted (general records); admins see everything.
export function assertDepartmentAccess(staff: StaffAccessor, fileDepartment: Department | null) {
  if (staff.role === "ADMIN" || !fileDepartment) return;
  if (staff.department !== fileDepartment) {
    throw new FileAccessDeniedError();
  }
}

export function filterFilesForStaff<T extends { department: Department | null }>(
  files: T[],
  staff: StaffAccessor
): T[] {
  if (staff.role === "ADMIN") return files;
  return files.filter((f) => !f.department || f.department === staff.department);
}
