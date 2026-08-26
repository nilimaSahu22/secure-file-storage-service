import { prisma } from "@/lib/prisma";

export interface InquiryInput {
  fullName: string;
  workEmail: string;
  organizationName: string;
  role: string;
  patientVolumePerDay?: string;
  problemStatement: string;
  phone?: string;
  consentGiven: boolean;
}

export function createInquiry(input: InquiryInput) {
  return prisma.inquiry.create({ data: input });
}
