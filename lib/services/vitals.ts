import { prisma } from "@/lib/prisma";
import { isVitalAbnormal } from "@/lib/clinical/rules";

export interface AddVitalInput {
  patientId: string;
  visitId?: string;
  type: string;
  value: string;
}

export function addVital(input: AddVitalInput) {
  const isAbnormal = isVitalAbnormal(input.type, input.value);
  return prisma.vitalSign.create({
    data: {
      patientId: input.patientId,
      visitId: input.visitId,
      type: input.type,
      value: input.value,
      isAbnormal,
    },
  });
}
