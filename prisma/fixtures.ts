import bcrypt from "bcrypt";
import { PrismaClient, Role, Department, AppointmentStatus, PriorAuthStatus, ReferralStatus, AlertSeverity } from "@prisma/client";
import { isVitalAbnormal } from "@/lib/clinical/rules";

// Demo credentials — documented in the README, never surfaced in-app.
export const DEMO_PASSWORD = "Demo1234!";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

const STAFF = [
  { key: "drRamirez", name: "Dr. Elena Ramirez", email: "elena.ramirez@meridian.health", role: Role.DOCTOR, department: Department.OPD },
  { key: "drChen", name: "Dr. Marcus Chen", email: "marcus.chen@meridian.health", role: Role.DOCTOR, department: Department.CARDIOLOGY },
  { key: "nursePatel", name: "Nurse Aisha Patel", email: "aisha.patel@meridian.health", role: Role.NURSE, department: Department.OPD },
  { key: "adminReyes", name: "Sam Reyes", email: "sam.reyes@meridian.health", role: Role.ADMIN, department: null },
] as const;

interface PatientFixture {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactPhone: string;
  contactEmail: string;
  medications: { name: string; dosage: string; frequency: string; daysAgo: number }[];
  allergies: { allergen: string; reaction?: string; severity: AlertSeverity }[];
  vitals: { type: string; value: string; daysAgo: number }[];
  testResults: { testName: string; result: string; normalRange?: string; daysAgo: number }[];
}

const PATIENTS: PatientFixture[] = [
  {
    firstName: "Margaret",
    lastName: "Okafor",
    dateOfBirth: "1958-03-14",
    gender: "Female",
    contactPhone: "555-0101",
    contactEmail: "margaret.okafor@example.com",
    medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", daysAgo: 200 },
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily", daysAgo: 200 },
    ],
    allergies: [{ allergen: "Penicillin", reaction: "Hives", severity: AlertSeverity.HIGH }],
    vitals: [
      { type: "Blood Pressure Systolic", value: "148", daysAgo: 3 },
      { type: "Blood Pressure Diastolic", value: "92", daysAgo: 3 },
      { type: "Heart Rate", value: "78", daysAgo: 3 },
      { type: "Glucose", value: "162", daysAgo: 3 },
    ],
    testResults: [
      { testName: "HbA1c", result: "7.2%", normalRange: "<5.7%", daysAgo: 14 },
      { testName: "Lipid Panel — LDL", result: "138 mg/dL", normalRange: "<100 mg/dL", daysAgo: 14 },
    ],
  },
  {
    firstName: "David",
    lastName: "Whitfield",
    dateOfBirth: "1972-11-02",
    gender: "Male",
    contactPhone: "555-0102",
    contactEmail: "david.whitfield@example.com",
    medications: [{ name: "Atorvastatin", dosage: "20mg", frequency: "Once daily at bedtime", daysAgo: 90 }],
    allergies: [{ allergen: "Sulfa drugs", reaction: "Rash", severity: AlertSeverity.MEDIUM }],
    vitals: [
      { type: "Blood Pressure Systolic", value: "118", daysAgo: 7 },
      { type: "Blood Pressure Diastolic", value: "76", daysAgo: 7 },
      { type: "Heart Rate", value: "68", daysAgo: 7 },
      { type: "Oxygen Saturation", value: "98", daysAgo: 7 },
    ],
    testResults: [{ testName: "Lipid Panel — LDL", result: "96 mg/dL", normalRange: "<100 mg/dL", daysAgo: 30 }],
  },
  {
    firstName: "Sofia",
    lastName: "Marchetti",
    dateOfBirth: "1990-06-21",
    gender: "Female",
    contactPhone: "555-0103",
    contactEmail: "sofia.marchetti@example.com",
    medications: [],
    allergies: [{ allergen: "NSAIDs", reaction: "Swelling", severity: AlertSeverity.MEDIUM }],
    vitals: [
      { type: "Heart Rate", value: "72", daysAgo: 1 },
      { type: "Temperature", value: "98.6", daysAgo: 1 },
      { type: "Respiratory Rate", value: "16", daysAgo: 1 },
    ],
    testResults: [],
  },
  {
    firstName: "Robert",
    lastName: "Nakamura",
    dateOfBirth: "1965-09-30",
    gender: "Male",
    contactPhone: "555-0104",
    contactEmail: "robert.nakamura@example.com",
    medications: [
      { name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", daysAgo: 2 },
      { name: "Warfarin", dosage: "5mg", frequency: "Once daily", daysAgo: 400 },
    ],
    allergies: [{ allergen: "Penicillin", reaction: "Anaphylaxis", severity: AlertSeverity.HIGH }],
    vitals: [
      { type: "Blood Pressure Systolic", value: "132", daysAgo: 2 },
      { type: "Blood Pressure Diastolic", value: "84", daysAgo: 2 },
      { type: "Heart Rate", value: "88", daysAgo: 2 },
      { type: "Temperature", value: "100.4", daysAgo: 2 },
    ],
    testResults: [{ testName: "INR", result: "2.4", normalRange: "2.0–3.0", daysAgo: 5 }],
  },
  {
    firstName: "Grace",
    lastName: "Lindqvist",
    dateOfBirth: "1948-01-17",
    gender: "Female",
    contactPhone: "555-0105",
    contactEmail: "grace.lindqvist@example.com",
    medications: [
      { name: "Levothyroxine", dosage: "75mcg", frequency: "Once daily", daysAgo: 500 },
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", daysAgo: 250 },
    ],
    allergies: [],
    vitals: [
      { type: "Blood Pressure Systolic", value: "142", daysAgo: 10 },
      { type: "Blood Pressure Diastolic", value: "88", daysAgo: 10 },
      { type: "Heart Rate", value: "58", daysAgo: 10 },
      { type: "Oxygen Saturation", value: "94", daysAgo: 10 },
    ],
    testResults: [{ testName: "TSH", result: "3.1 mIU/L", normalRange: "0.4–4.0 mIU/L", daysAgo: 20 }],
  },
  {
    firstName: "Jamal",
    lastName: "Thompson",
    dateOfBirth: "1985-04-08",
    gender: "Male",
    contactPhone: "555-0106",
    contactEmail: "jamal.thompson@example.com",
    medications: [{ name: "Albuterol", dosage: "90mcg", frequency: "As needed", daysAgo: 60 }],
    allergies: [{ allergen: "Latex", reaction: "Contact dermatitis", severity: AlertSeverity.LOW }],
    vitals: [
      { type: "Respiratory Rate", value: "22", daysAgo: 4 },
      { type: "Oxygen Saturation", value: "93", daysAgo: 4 },
      { type: "Heart Rate", value: "96", daysAgo: 4 },
    ],
    testResults: [],
  },
  {
    firstName: "Yuki",
    lastName: "Tanaka",
    dateOfBirth: "2001-12-25",
    gender: "Female",
    contactPhone: "555-0107",
    contactEmail: "yuki.tanaka@example.com",
    medications: [],
    allergies: [],
    vitals: [
      { type: "Blood Pressure Systolic", value: "110", daysAgo: 15 },
      { type: "Blood Pressure Diastolic", value: "70", daysAgo: 15 },
      { type: "Heart Rate", value: "64", daysAgo: 15 },
    ],
    testResults: [{ testName: "CBC — WBC", result: "6.8 K/uL", normalRange: "4.5–11.0 K/uL", daysAgo: 15 }],
  },
  {
    firstName: "Harold",
    lastName: "Bramwell",
    dateOfBirth: "1953-07-19",
    gender: "Male",
    contactPhone: "555-0108",
    contactEmail: "harold.bramwell@example.com",
    medications: [
      { name: "Cephalexin", dosage: "500mg", frequency: "Four times daily", daysAgo: 1 },
    ],
    allergies: [{ allergen: "Penicillin", reaction: "Hives", severity: AlertSeverity.HIGH }],
    vitals: [
      { type: "Blood Pressure Systolic", value: "128", daysAgo: 1 },
      { type: "Heart Rate", value: "74", daysAgo: 1 },
      { type: "Glucose", value: "110", daysAgo: 1 },
    ],
    testResults: [{ testName: "Creatinine", result: "1.1 mg/dL", normalRange: "0.7–1.3 mg/dL", daysAgo: 1 }],
  },
];

const NOTES = [
  {
    patientIndex: 0,
    authorKey: "drRamirez" as const,
    daysAgo: 14,
    subjective: "Patient reports occasional fatigue and increased thirst over the past two weeks. Reports adherence to metformin and lisinopril.",
    objective: "BP 148/92, HR 78. HbA1c 7.2%, up from 6.8% three months ago. No acute distress.",
    assessment: "Type 2 diabetes mellitus, suboptimally controlled. Hypertension, borderline controlled.",
    plan: "Increase metformin to 1000mg twice daily. Continue lisinopril. Recheck HbA1c in 3 months. Diabetic diet counseling referral.",
  },
  {
    patientIndex: 1,
    authorKey: "drChen" as const,
    daysAgo: 30,
    subjective: "Follow-up for hyperlipidemia. No chest pain, no shortness of breath. Reports consistent statin use.",
    objective: "BP 118/76, HR 68. LDL 96 mg/dL, improved from 142 mg/dL six months ago.",
    assessment: "Hyperlipidemia, well controlled on current statin therapy.",
    plan: "Continue atorvastatin 20mg. Repeat lipid panel in 6 months. Encourage continued dietary modification.",
  },
  {
    patientIndex: 3,
    authorKey: "drRamirez" as const,
    daysAgo: 5,
    subjective: "Patient presents with low-grade fever and productive cough for 3 days. On warfarin for atrial fibrillation.",
    objective: "Temp 100.4F, BP 132/84, HR 88. Lungs with scattered rhonchi right base. INR 2.4, therapeutic.",
    assessment: "Community-acquired pneumonia, right lower lobe. Atrial fibrillation, anticoagulation therapeutic.",
    plan: "Start empiric antibiotic therapy. Monitor INR closely given antibiotic interaction risk with warfarin. Follow up in 5-7 days or sooner if worsening.",
  },
];

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in FK-safe order (children before parents).
  await prisma.codingSuggestion.deleteMany();
  await prisma.task.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.vitalSign.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.priorAuthorization.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.chartSummary.deleteMany();
  await prisma.clinicalAlert.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.staffUser.deleteMany();
  await prisma.departmentWorkflow.deleteMany();

  const staffPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const staffByKey = new Map<string, string>();
  for (const s of STAFF) {
    const created = await prisma.staffUser.create({
      data: { name: s.name, email: s.email, passwordHash: staffPasswordHash, role: s.role, department: s.department },
    });
    staffByKey.set(s.key, created.id);
  }

  const patientIds: string[] = [];
  for (const p of PATIENTS) {
    const patient = await prisma.patient.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dateOfBirth),
        gender: p.gender,
        contactPhone: p.contactPhone,
        contactEmail: p.contactEmail,
        medications: {
          create: p.medications.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            prescribedAt: daysAgo(m.daysAgo),
          })),
        },
        allergies: { create: p.allergies },
        vitals: {
          create: p.vitals.map((v) => ({
            type: v.type,
            value: v.value,
            isAbnormal: isVitalAbnormal(v.type, v.value),
            recordedAt: daysAgo(v.daysAgo),
          })),
        },
        testResults: {
          create: p.testResults.map((t) => ({
            testName: t.testName,
            result: t.result,
            normalRange: t.normalRange,
            recordedAt: daysAgo(t.daysAgo),
          })),
        },
      },
    });
    patientIds.push(patient.id);
  }

  // Harold Bramwell (last patient fixture) doubles as the demo Patient Portal account.
  const patientPortalPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.patient.update({
    where: { id: patientIds[patientIds.length - 1] },
    data: {
      portalEmail: "harold.bramwell@patientmail.example",
      portalPasswordHash: patientPortalPasswordHash,
    },
  });

  for (const n of NOTES) {
    await prisma.clinicalNote.create({
      data: {
        patientId: patientIds[n.patientIndex],
        authorId: staffByKey.get(n.authorKey)!,
        subjective: n.subjective,
        objective: n.objective,
        assessment: n.assessment,
        plan: n.plan,
        isAiGenerated: false,
        createdAt: daysAgo(n.daysAgo),
      },
    });
  }

  // Appointments: mix of past/completed and upcoming/scheduled.
  const providerIds = [staffByKey.get("drRamirez")!, staffByKey.get("drChen")!];
  await prisma.appointment.createMany({
    data: [
      { patientId: patientIds[0], providerId: providerIds[0], scheduledAt: daysFromNow(3), status: AppointmentStatus.SCHEDULED, reason: "Diabetes follow-up" },
      { patientId: patientIds[1], providerId: providerIds[1], scheduledAt: daysFromNow(7), status: AppointmentStatus.SCHEDULED, reason: "Lipid panel review" },
      { patientId: patientIds[3], providerId: providerIds[0], scheduledAt: daysFromNow(2), status: AppointmentStatus.SCHEDULED, reason: "Pneumonia recheck" },
      { patientId: patientIds[4], providerId: providerIds[0], scheduledAt: daysAgo(10), status: AppointmentStatus.COMPLETED, reason: "Thyroid check" },
      { patientId: patientIds[5], providerId: providerIds[1], scheduledAt: daysAgo(4), status: AppointmentStatus.COMPLETED, reason: "Asthma follow-up" },
      { patientId: patientIds[6], providerId: providerIds[0], scheduledAt: daysFromNow(14), status: AppointmentStatus.SCHEDULED, reason: "Annual physical" },
      { patientId: patientIds[2], providerId: providerIds[1], scheduledAt: daysAgo(20), status: AppointmentStatus.NO_SHOW, reason: "General consult" },
    ],
  });

  // Prior authorizations at various stages.
  await prisma.priorAuthorization.createMany({
    data: [
      { patientId: patientIds[0], serviceDescription: "Continuous glucose monitor", status: PriorAuthStatus.APPROVED, submittedAt: daysAgo(10) },
      { patientId: patientIds[3], serviceDescription: "Chest CT with contrast", status: PriorAuthStatus.UNDER_REVIEW, submittedAt: daysAgo(2) },
      { patientId: patientIds[5], serviceDescription: "Pulmonary function test", status: PriorAuthStatus.SUBMITTED, submittedAt: daysAgo(1) },
    ],
  });

  // Referrals.
  await prisma.referral.createMany({
    data: [
      {
        patientId: patientIds[0],
        fromProviderId: staffByKey.get("drRamirez")!,
        toProviderId: staffByKey.get("drChen")!,
        reason: "Evaluate for cardiovascular risk given uncontrolled hypertension and diabetes",
        status: ReferralStatus.PENDING,
        createdAt: daysAgo(6),
      },
      {
        patientId: patientIds[4],
        fromProviderId: staffByKey.get("drRamirez")!,
        toProviderId: staffByKey.get("drChen")!,
        reason: "Bradycardia noted on recent vitals, cardiology evaluation requested",
        status: ReferralStatus.ACCEPTED,
        createdAt: daysAgo(9),
      },
    ],
  });

  // Manually-seeded clinical alerts (independent of the live CDS rule engine,
  // so the dashboard has realistic alert history even before a user triggers new ones).
  await prisma.clinicalAlert.createMany({
    data: [
      {
        patientId: patientIds[3],
        type: "DRUG_ALLERGY_CONFLICT",
        message: "Amoxicillin may conflict with documented allergy to Penicillin: Penicillin-class antibiotic conflicts with documented penicillin allergy.",
        severity: AlertSeverity.HIGH,
        triggeredAt: daysAgo(2),
      },
      {
        patientId: patientIds[7],
        type: "DRUG_ALLERGY_CONFLICT",
        message: "Cephalexin may conflict with documented allergy to Penicillin: Cephalosporin conflicts with documented penicillin/cephalosporin allergy (cross-reactivity).",
        severity: AlertSeverity.HIGH,
        triggeredAt: daysAgo(1),
      },
      {
        patientId: patientIds[5],
        type: "ABNORMAL_VITAL",
        message: "Oxygen Saturation 93% is below the normal range (95-100%).",
        severity: AlertSeverity.MEDIUM,
        triggeredAt: daysAgo(4),
      },
    ],
  });

  // A couple of manually-created tasks so the queue isn't empty pre-demo.
  await prisma.task.createMany({
    data: [
      {
        patientId: patientIds[0],
        assignedToId: staffByKey.get("nursePatel")!,
        description: "Schedule diabetic diet counseling referral",
        isAutoGenerated: false,
        createdAt: daysAgo(13),
      },
      {
        patientId: patientIds[3],
        assignedToId: staffByKey.get("nursePatel")!,
        description: "Call patient in 48 hours to confirm symptom improvement on antibiotics",
        isAutoGenerated: false,
        createdAt: daysAgo(4),
      },
    ],
  });

  await prisma.departmentWorkflow.createMany({
    data: [
      {
        department: Department.RADIOLOGY,
        intakeSteps: ["Reason for imaging", "Prior imaging on file?", "Contrast allergy check"],
        triageRules: [{ condition: "Suspected stroke or acute trauma", priority: "STAT" }],
        escalationPath: "STAT reads routed directly to on-call radiologist",
      },
      {
        department: Department.OPD,
        intakeSteps: ["Chief complaint", "Current medications", "Insurance verification"],
        triageRules: [{ condition: "Chest pain or difficulty breathing", priority: "High" }],
        escalationPath: "Urgent symptoms escalate to same-day physician slot",
      },
      {
        department: Department.CARDIOLOGY,
        intakeSteps: ["Cardiac history", "Recent ECG on file?", "Symptom onset timing"],
        triageRules: [{ condition: "Chest pain with abnormal vitals", priority: "High" }],
        escalationPath: "Chest pain with abnormal vitals escalates to Emergency",
      },
      {
        department: Department.EMERGENCY,
        intakeSteps: ["Triage severity", "Airway/breathing/circulation check", "Allergy check"],
        triageRules: [{ condition: "High-severity triage score", priority: "Critical" }],
        escalationPath: "High-severity triage pages the attending immediately",
      },
    ],
  });
}
