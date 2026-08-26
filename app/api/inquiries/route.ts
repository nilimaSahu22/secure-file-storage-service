import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createInquiry } from "@/lib/services/inquiries";

export const dynamic = "force-dynamic";

const inquirySchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  workEmail: z.string().trim().email().max(200),
  organizationName: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(100),
  patientVolumePerDay: z.string().trim().max(50).optional(),
  problemStatement: z.string().trim().min(1).max(4000),
  phone: z.string().trim().max(50).optional(),
  consentGiven: z.literal(true),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "InvalidInquiry", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await createInquiry(parsed.data);
    return NextResponse.json({ status: "ok" }, { status: 201 });
  } catch (err) {
    console.error("Inquiry creation failed:", err);
    return NextResponse.json({ error: "InquiryFailed" }, { status: 500 });
  }
}
