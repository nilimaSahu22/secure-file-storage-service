import { prisma } from "@/lib/prisma";
import { AppointmentStatus, PriorAuthStatus, TaskStatus } from "@prisma/client";
import { getPatientById, getPatientBasic, searchPatients } from "@/lib/services/patients";
import { buildChartContext } from "@/lib/ai/chartContext";
import { buildDocumentContext } from "@/lib/ai/groundedChat";
import { getStaffUsers } from "@/lib/services/staff";
import {
  bookAppointment,
  requestAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
} from "@/lib/services/appointments";
import { createTask, updateTaskStatus, getTasksForPatient, getAllTasks } from "@/lib/services/tasks";
import { getPriorAuthsForPatient, submitPriorAuth, updatePriorAuthStatus } from "@/lib/services/priorAuth";
import { getReferralsForPatient, createReferral } from "@/lib/services/referrals";
import { listVisitsForPatient } from "@/lib/services/visits";
import { getOutstandingFollowUps, completeFollowUp, dismissFollowUp } from "@/lib/services/followUps";
import { getAllWorkflows } from "@/lib/services/workflows";
import { getAuditLogs } from "@/lib/services/auditLog";
import { computeTrendFlags } from "@/lib/services/trendFlags";
import { createDocumentRequest, listDocumentRequests } from "@/lib/services/documentRequests";
import { logAudit } from "@/lib/audit";
import { notifyStaff, notifyPatient } from "@/lib/services/notifications";

export interface ToolContext {
  ownerType: "staff" | "patient";
  ownerId: string;
  focusedPatientId: string | null;
  staffId: string | null;
  actorName: string;
  isAdmin: boolean;
}

interface BaseTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
interface ReadTool extends BaseTool {
  kind: "read";
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<unknown>;
}
interface WriteTool extends BaseTool {
  kind: "write";
  describe(input: Record<string, unknown>, ctx: ToolContext): Promise<string> | string;
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<{ message: string }>;
}
export type AssistantTool = ReadTool | WriteTool;

class ToolError extends Error {}

function resolvePatientId(ctx: ToolContext, requested?: unknown): string {
  if (ctx.ownerType === "patient") return ctx.ownerId;
  const id = typeof requested === "string" && requested ? requested : ctx.focusedPatientId;
  if (!id) throw new ToolError("No patient is in context. Ask the user which patient, or set the focused patient.");
  return id;
}

async function assertPatientAllowed(ctx: ToolContext, patientId: string) {
  if (ctx.ownerType === "patient" && patientId !== ctx.ownerId) {
    throw new ToolError("Not permitted.");
  }
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const str = (description: string) => ({ type: "string", description });
const strOpt = (description: string) => ({ type: "string", description });

// ---------------------------------------------------------------------------
// READ TOOLS
// ---------------------------------------------------------------------------

const readTools: ReadTool[] = [
  {
    name: "find_patient",
    description: "Search patients by name or email. Staff only.",
    input_schema: obj({ query: str("Name or partial name to search for.") }, ["query"]),
    kind: "read",
    async run(input) {
      const rows = await searchPatients(String(input.query ?? ""));
      return rows.slice(0, 15).map((p) => ({
        patientId: p.id,
        name: `${p.firstName} ${p.lastName}`,
        dob: p.dateOfBirth.toISOString().slice(0, 10),
      }));
    },
  },
  {
    name: "get_patient_summary",
    description: "The patient's chart: demographics, allergies, current medications, recent vitals and labs, active alerts.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit to use the patient in context.") }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      await assertPatientAllowed(ctx, patientId);
      const patient = await getPatientById(patientId);
      if (!patient) throw new ToolError("Patient not found.");
      return {
        name: `${patient.firstName} ${patient.lastName}`,
        chart: buildChartContext(patient),
      };
    },
  },
  {
    name: "get_clinical_notes",
    description: "The patient's clinical notes (SOAP), most recent first.",
    input_schema: obj({
      patientId: strOpt("Patient id. Omit to use the patient in context."),
      limit: { type: "integer", description: "How many notes (default 5)." },
    }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      await assertPatientAllowed(ctx, patientId);
      const patient = await getPatientById(patientId);
      if (!patient) throw new ToolError("Patient not found.");
      const limit = typeof input.limit === "number" ? input.limit : 5;
      return patient.notes.slice(0, limit).map((n) => ({
        date: n.createdAt.toISOString().slice(0, 10),
        author: n.author.name,
        subjective: n.subjective,
        objective: n.objective,
        assessment: n.assessment,
        plan: n.plan,
      }));
    },
  },
  {
    name: "search_patient_documents",
    description:
      "The text of the patient's accepted uploaded documents. Use this to answer questions about lab reports, imaging, discharge summaries etc. Cite documents by their exact file name.",
    input_schema: obj({
      patientId: strOpt("Patient id. Omit to use the patient in context."),
      query: strOpt("What you're looking for (used for logging only)."),
    }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      await assertPatientAllowed(ctx, patientId);
      const patient = await getPatientById(patientId);
      if (!patient) throw new ToolError("Patient not found.");
      const { context, documents } = buildDocumentContext(patient.files);
      return { documentNames: documents.map((d) => d.fileName), text: context.slice(0, 12000) };
    },
  },
  {
    name: "list_appointments",
    description: "Appointments for a patient, or (staff, no patient) all upcoming appointments.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit for all upcoming (staff).") }),
    kind: "read",
    async run(input, ctx) {
      if (ctx.ownerType === "staff" && !input.patientId && !ctx.focusedPatientId) {
        const rows = await prisma.appointment.findMany({
          where: { scheduledAt: { gte: new Date() }, status: { in: ["SCHEDULED", "REQUESTED"] } },
          orderBy: { scheduledAt: "asc" },
          take: 25,
          include: { patient: true, provider: true },
        });
        return rows.map((a) => ({
          appointmentId: a.id,
          patient: `${a.patient.firstName} ${a.patient.lastName}`,
          provider: a.provider.name,
          when: a.scheduledAt.toISOString(),
          status: a.status,
          reason: a.reason,
        }));
      }
      const patientId = resolvePatientId(ctx, input.patientId);
      await assertPatientAllowed(ctx, patientId);
      const rows = await prisma.appointment.findMany({
        where: { patientId },
        orderBy: { scheduledAt: "desc" },
        include: { provider: true },
      });
      return rows.map((a) => ({
        appointmentId: a.id,
        provider: a.provider.name,
        when: a.scheduledAt.toISOString(),
        status: a.status,
        reason: a.reason,
      }));
    },
  },
  {
    name: "list_tasks",
    description: "Task queue — all tasks, or a patient's tasks. Staff only.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit for the whole queue.") }),
    kind: "read",
    async run(input) {
      const rows = input.patientId
        ? await getTasksForPatient(String(input.patientId))
        : (await getAllTasks()).slice(0, 30);
      return rows.map((t) => ({
        taskId: t.id,
        description: t.description,
        status: t.status,
        assignedTo: t.assignedTo?.name ?? null,
      }));
    },
  },
  {
    name: "list_prior_auths",
    description: "Prior authorizations for a patient. Staff only.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit to use the patient in context.") }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      const rows = await getPriorAuthsForPatient(patientId);
      return rows.map((p) => ({ priorAuthId: p.id, service: p.serviceDescription, status: p.status }));
    },
  },
  {
    name: "list_referrals",
    description: "Referrals for a patient. Staff only.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit to use the patient in context.") }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      const rows = await getReferralsForPatient(patientId);
      return rows.map((r) => ({
        referralId: r.id,
        from: r.fromProvider.name,
        to: r.toProvider.name,
        reason: r.reason,
        status: r.status,
      }));
    },
  },
  {
    name: "list_visits",
    description: "Signed visits for a patient (date, provider, prescription, plain-language summary).",
    input_schema: obj({ patientId: strOpt("Patient id. Omit to use the patient in context.") }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      await assertPatientAllowed(ctx, patientId);
      const rows = await listVisitsForPatient(patientId, { status: "SIGNED" });
      return rows.map((v) => ({
        visitId: v.id,
        date: (v.signedAt ?? v.startedAt).toISOString().slice(0, 10),
        provider: v.author?.name ?? v.signedBy?.name ?? null,
        assessment: v.note?.assessment ?? null,
        plan: v.note?.plan ?? null,
        medications: (v.prescription?.items ?? []).map(
          (i) => `${i.medicationName} ${i.dose} ${i.frequency}`
        ),
        investigations: v.prescription?.investigations ?? [],
      }));
    },
  },
  {
    name: "list_followups",
    description: "Outstanding follow-up items / reminders for a patient.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit to use the patient in context.") }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      await assertPatientAllowed(ctx, patientId);
      const rows = await getOutstandingFollowUps(patientId);
      return rows.map((f) => ({
        followUpItemId: f.id,
        kind: f.kind,
        description: f.description,
        dueAt: f.dueAt?.toISOString().slice(0, 10) ?? null,
      }));
    },
  },
  {
    name: "get_department_workflow",
    description: "A department's intake steps, triage rules, and escalation path. Staff only.",
    input_schema: obj({ department: { type: "string", enum: ["RADIOLOGY", "OPD", "CARDIOLOGY", "EMERGENCY"] } }, [
      "department",
    ]),
    kind: "read",
    async run(input) {
      const all = await getAllWorkflows();
      const wf = all.find((w) => w.department === input.department);
      if (!wf) throw new ToolError("No workflow configured for that department.");
      return wf;
    },
  },
  {
    name: "get_providers",
    description: "The clinicians in the system (id, name, role, department). Use to pick a provider id.",
    input_schema: obj({}),
    kind: "read",
    async run() {
      const rows = await getStaffUsers();
      return rows.map((s) => ({ providerId: s.id, name: s.name, role: s.role, department: s.department }));
    },
  },
  {
    name: "check_trends",
    description: "Compute vital/lab trends for a patient with a short non-diagnostic note. Staff only.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit to use the patient in context.") }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      const { flags, detectedCount } = await computeTrendFlags(patientId);
      if (detectedCount === 0) return { message: "No trends — the patient needs at least 3 readings of the same measurement." };
      return flags.map((f) => ({ metric: f.metric, direction: f.direction, summary: f.deterministicSummary }));
    },
  },
  {
    name: "list_document_requests",
    description: "Documents the care team has asked a patient to upload, and their status.",
    input_schema: obj({ patientId: strOpt("Patient id. Omit to use the patient in context.") }),
    kind: "read",
    async run(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      await assertPatientAllowed(ctx, patientId);
      const rows = await listDocumentRequests(patientId);
      return rows.map((r) => ({
        documentRequestId: r.id,
        type: r.documentType,
        description: r.description,
        status: r.status,
        dueAt: r.dueAt?.toISOString().slice(0, 10) ?? null,
      }));
    },
  },
  {
    name: "search_audit_log",
    description: "Search the audit log by actor name, action, and date range. Admin only.",
    input_schema: obj({
      actor: strOpt("Actor name contains."),
      action: strOpt("Action contains, e.g. 'login' or 'visit'."),
      from: strOpt("ISO date lower bound."),
      to: strOpt("ISO date upper bound."),
    }),
    kind: "read",
    async run(input, ctx) {
      if (!ctx.isAdmin) throw new ToolError("Admin only.");
      const rows = await getAuditLogs({
        actorName: input.actor ? String(input.actor) : undefined,
        action: input.action ? String(input.action) : undefined,
        from: input.from ? new Date(String(input.from)) : undefined,
        to: input.to ? new Date(`${input.to}T23:59:59`) : undefined,
      });
      return rows.slice(0, 30).map((r) => ({
        when: r.createdAt.toISOString(),
        actor: r.actorName,
        action: r.action,
        target: r.targetType,
      }));
    },
  },
];

// ---------------------------------------------------------------------------
// WRITE TOOLS (proposed → confirmed)
// ---------------------------------------------------------------------------

async function patientName(id: string): Promise<string> {
  const p = await getPatientBasic(id);
  return p ? `${p.firstName} ${p.lastName}` : "the patient";
}
async function providerName(id: string): Promise<string> {
  const s = await prisma.staffUser.findUnique({ where: { id }, select: { name: true } });
  return s?.name ?? "the provider";
}
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const staffWriteTools: WriteTool[] = [
  {
    name: "book_appointment",
    description: "Book a scheduled appointment for a patient.",
    input_schema: obj(
      {
        patientId: strOpt("Patient id. Omit to use the patient in context."),
        providerId: str("Provider id (from get_providers)."),
        whenISO: str("Appointment date-time in ISO 8601."),
        reason: strOpt("Reason for the visit."),
      },
      ["providerId", "whenISO"]
    ),
    kind: "write",
    async describe(input, ctx) {
      const pid = resolvePatientId(ctx, input.patientId);
      return `Book ${await patientName(pid)} with ${await providerName(String(input.providerId))} on ${fmtWhen(
        String(input.whenISO)
      )}${input.reason ? ` — ${input.reason}` : ""}.`;
    },
    async execute(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      const when = new Date(String(input.whenISO));
      if (Number.isNaN(when.getTime())) throw new ToolError("Invalid date.");
      const apt = await bookAppointment({
        patientId,
        providerId: String(input.providerId),
        scheduledAt: when,
        reason: input.reason ? String(input.reason) : undefined,
      });
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "appointment.booked",
        targetType: "Appointment",
        targetId: apt.id,
        metadata: { patientId, via: "assistant" },
      });
      await notifyPatient(patientId, {
        category: "appointment",
        title: "Appointment booked",
        body: `Your care team scheduled a visit for ${fmtWhen(when.toISOString())}.`,
        linkPath: "/portal/appointments",
      });
      return { message: `Appointment booked for ${await patientName(patientId)} on ${fmtWhen(when.toISOString())}.` };
    },
  },
  {
    name: "reschedule_appointment",
    description: "Move an existing appointment to a new date-time.",
    input_schema: obj({ appointmentId: str("Appointment id."), whenISO: str("New date-time, ISO 8601.") }, [
      "appointmentId",
      "whenISO",
    ]),
    kind: "write",
    async describe(input) {
      return `Reschedule appointment to ${fmtWhen(String(input.whenISO))}.`;
    },
    async execute(input, ctx) {
      const apt = await prisma.appointment.findUnique({ where: { id: String(input.appointmentId) } });
      if (!apt) throw new ToolError("Appointment not found.");
      const when = new Date(String(input.whenISO));
      if (Number.isNaN(when.getTime())) throw new ToolError("Invalid date.");
      await rescheduleAppointment(apt.id, when);
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "appointment.rescheduled",
        targetType: "Appointment",
        targetId: apt.id,
        metadata: { via: "assistant" },
      });
      await notifyPatient(apt.patientId, {
        category: "appointment",
        title: "Appointment rescheduled",
        body: `Your visit was moved to ${fmtWhen(when.toISOString())}.`,
        linkPath: "/portal/appointments",
      });
      return { message: `Appointment moved to ${fmtWhen(when.toISOString())}.` };
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancel an appointment.",
    input_schema: obj({ appointmentId: str("Appointment id.") }, ["appointmentId"]),
    kind: "write",
    describe() {
      return "Cancel this appointment.";
    },
    async execute(input, ctx) {
      const apt = await prisma.appointment.findUnique({ where: { id: String(input.appointmentId) } });
      if (!apt) throw new ToolError("Appointment not found.");
      await updateAppointmentStatus(apt.id, AppointmentStatus.CANCELLED);
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "appointment.cancelled",
        targetType: "Appointment",
        targetId: apt.id,
        metadata: { via: "assistant" },
      });
      await notifyPatient(apt.patientId, {
        category: "appointment",
        title: "Appointment cancelled",
        body: `Your visit on ${fmtWhen(apt.scheduledAt.toISOString())} was cancelled.`,
        linkPath: "/portal/appointments",
      });
      return { message: "Appointment cancelled." };
    },
  },
  {
    name: "create_task",
    description: "Add a task to the queue for a patient.",
    input_schema: obj(
      {
        patientId: strOpt("Patient id. Omit to use the patient in context."),
        description: str("What needs doing."),
        assignToProviderId: strOpt("Staff id to assign it to."),
      },
      ["description"]
    ),
    kind: "write",
    async describe(input, ctx) {
      const pid = resolvePatientId(ctx, input.patientId);
      return `Create task for ${await patientName(pid)}: "${input.description}".`;
    },
    async execute(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      const task = await createTask({
        patientId,
        description: String(input.description),
        assignedToId: input.assignToProviderId ? String(input.assignToProviderId) : null,
      });
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "task.created",
        targetType: "Task",
        targetId: task.id,
        metadata: { patientId, via: "assistant" },
      });
      if (task.assignedToId) {
        await notifyStaff(task.assignedToId, {
          category: "task",
          title: "Task assigned to you",
          body: `${await patientName(patientId)}: ${String(input.description)}`,
          linkPath: "/dashboard/tasks",
        });
      }
      return { message: "Task added to the queue." };
    },
  },
  {
    name: "update_task_status",
    description: "Change a task's status.",
    input_schema: obj(
      { taskId: str("Task id."), status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] } },
      ["taskId", "status"]
    ),
    kind: "write",
    describe(input) {
      return `Set task status to ${String(input.status).replace("_", " ").toLowerCase()}.`;
    },
    async execute(input, ctx) {
      await updateTaskStatus(String(input.taskId), input.status as TaskStatus);
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "task.status_changed",
        targetType: "Task",
        targetId: String(input.taskId),
        metadata: { status: String(input.status), via: "assistant" },
      });
      return { message: "Task updated." };
    },
  },
  {
    name: "submit_prior_auth",
    description: "Submit a new prior authorization request for a service.",
    input_schema: obj(
      { patientId: strOpt("Patient id. Omit to use the patient in context."), serviceDescription: str("The service.") },
      ["serviceDescription"]
    ),
    kind: "write",
    async describe(input, ctx) {
      const pid = resolvePatientId(ctx, input.patientId);
      return `Submit a prior authorization for ${await patientName(pid)}: "${input.serviceDescription}".`;
    },
    async execute(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      const pa = await submitPriorAuth(patientId, String(input.serviceDescription));
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "priorauth.submitted",
        targetType: "PriorAuthorization",
        targetId: pa.id,
        metadata: { patientId, via: "assistant" },
      });
      return { message: "Prior authorization submitted." };
    },
  },
  {
    name: "update_prior_auth_status",
    description: "Advance a prior authorization's status.",
    input_schema: obj(
      {
        priorAuthId: str("Prior auth id."),
        status: { type: "string", enum: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DENIED"] },
      },
      ["priorAuthId", "status"]
    ),
    kind: "write",
    describe(input) {
      return `Set prior authorization status to ${String(input.status).replace("_", " ").toLowerCase()}.`;
    },
    async execute(input, ctx) {
      await updatePriorAuthStatus(String(input.priorAuthId), input.status as PriorAuthStatus);
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "priorauth.status_changed",
        targetType: "PriorAuthorization",
        targetId: String(input.priorAuthId),
        metadata: { status: String(input.status), via: "assistant" },
      });
      return { message: "Prior authorization updated." };
    },
  },
  {
    name: "request_document",
    description:
      "Ask the patient to upload a specific document (e.g. a clinic letter or lab report). It shows on their portal as something to upload.",
    input_schema: obj(
      {
        patientId: strOpt("Patient id. Omit to use the patient in context."),
        documentType: str("Short label for the document, e.g. 'Cardiology clinic letter'."),
        description: str("What exactly you need and why (shown to the patient)."),
        dueBy: strOpt("ISO date the patient should upload it by."),
      },
      ["documentType", "description"]
    ),
    kind: "write",
    async describe(input, ctx) {
      const pid = resolvePatientId(ctx, input.patientId);
      return `Ask ${await patientName(pid)} to upload: ${input.documentType} — ${input.description}.`;
    },
    async execute(input, ctx) {
      if (!ctx.staffId) throw new ToolError("Your session is out of date — please log in again.");
      const patientId = resolvePatientId(ctx, input.patientId);
      const due = input.dueBy ? new Date(String(input.dueBy)) : null;
      const req = await createDocumentRequest({
        patientId,
        requestedById: ctx.staffId,
        documentType: String(input.documentType),
        description: String(input.description),
        dueAt: due && !Number.isNaN(due.getTime()) ? due : null,
      });
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "documentrequest.created",
        targetType: "DocumentRequest",
        targetId: req.id,
        metadata: { patientId, documentType: String(input.documentType), via: "assistant" },
      });
      await notifyPatient(patientId, {
        category: "document",
        title: "Document requested",
        body: `${ctx.actorName} asked you to upload: ${String(input.documentType)}.`,
        linkPath: `/portal/documents?type=${encodeURIComponent(String(input.documentType))}`,
      });
      return { message: `Asked ${await patientName(patientId)} to upload their ${input.documentType}.` };
    },
  },
  {
    name: "create_referral",
    description: "Create a referral from one provider to another for a patient.",
    input_schema: obj(
      {
        patientId: strOpt("Patient id. Omit to use the patient in context."),
        fromProviderId: str("Referring provider id."),
        toProviderId: str("Receiving provider id."),
        reason: str("Reason for the referral."),
      },
      ["fromProviderId", "toProviderId", "reason"]
    ),
    kind: "write",
    async describe(input, ctx) {
      const pid = resolvePatientId(ctx, input.patientId);
      return `Refer ${await patientName(pid)} from ${await providerName(String(input.fromProviderId))} to ${await providerName(
        String(input.toProviderId)
      )} — ${input.reason}.`;
    },
    async execute(input, ctx) {
      const patientId = resolvePatientId(ctx, input.patientId);
      const ref = await createReferral({
        patientId,
        fromProviderId: String(input.fromProviderId),
        toProviderId: String(input.toProviderId),
        reason: String(input.reason),
      });
      await logAudit({
        actorType: "staff",
        actorId: ctx.staffId,
        actorName: ctx.actorName,
        action: "referral.created",
        targetType: "Referral",
        targetId: ref.id,
        metadata: { patientId, via: "assistant" },
      });
      return { message: "Referral created." };
    },
  },
];

const patientWriteTools: WriteTool[] = [
  {
    name: "request_appointment",
    description: "Request an appointment with a provider (lands as a request for staff to confirm).",
    input_schema: obj(
      {
        providerId: str("Provider id (from get_providers)."),
        preferredWhenISO: str("Preferred date-time, ISO 8601."),
        reason: strOpt("Reason for the visit."),
      },
      ["providerId", "preferredWhenISO"]
    ),
    kind: "write",
    async describe(input) {
      return `Request an appointment with ${await providerName(String(input.providerId))} for ${fmtWhen(
        String(input.preferredWhenISO)
      )}${input.reason ? ` — ${input.reason}` : ""}.`;
    },
    async execute(input, ctx) {
      const when = new Date(String(input.preferredWhenISO));
      if (Number.isNaN(when.getTime())) throw new ToolError("Invalid date.");
      const apt = await requestAppointment({
        patientId: ctx.ownerId,
        providerId: String(input.providerId),
        scheduledAt: when,
        reason: input.reason ? String(input.reason) : undefined,
      });
      await logAudit({
        actorType: "patient",
        actorId: ctx.ownerId,
        actorName: ctx.actorName,
        action: "appointment.requested",
        targetType: "Appointment",
        targetId: apt.id,
        metadata: { via: "assistant" },
      });
      return { message: "Appointment request sent to your care team." };
    },
  },
  {
    name: "complete_reminder",
    description: "Mark one of your reminders / follow-up items as done.",
    input_schema: obj({ followUpItemId: str("Follow-up item id.") }, ["followUpItemId"]),
    kind: "write",
    describe() {
      return "Mark this reminder as done.";
    },
    async execute(input, ctx) {
      const item = await prisma.followUpItem.findUnique({ where: { id: String(input.followUpItemId) } });
      if (!item || item.patientId !== ctx.ownerId) throw new ToolError("Reminder not found.");
      await completeFollowUp(item.id);
      await logAudit({
        actorType: "patient",
        actorId: ctx.ownerId,
        actorName: ctx.actorName,
        action: "followup.completed",
        targetType: "FollowUpItem",
        targetId: item.id,
        metadata: { via: "assistant" },
      });
      return { message: "Reminder marked done." };
    },
  },
  {
    name: "dismiss_reminder",
    description: "Dismiss one of your reminders as not needed.",
    input_schema: obj({ followUpItemId: str("Follow-up item id.") }, ["followUpItemId"]),
    kind: "write",
    describe() {
      return "Dismiss this reminder.";
    },
    async execute(input, ctx) {
      const item = await prisma.followUpItem.findUnique({ where: { id: String(input.followUpItemId) } });
      if (!item || item.patientId !== ctx.ownerId) throw new ToolError("Reminder not found.");
      await dismissFollowUp(item.id);
      await logAudit({
        actorType: "patient",
        actorId: ctx.ownerId,
        actorName: ctx.actorName,
        action: "followup.dismissed",
        targetType: "FollowUpItem",
        targetId: item.id,
        metadata: { via: "assistant" },
      });
      return { message: "Reminder dismissed." };
    },
  },
];

const STAFF_READ = ["find_patient", "get_patient_summary", "get_clinical_notes", "search_patient_documents",
  "list_appointments", "list_tasks", "list_prior_auths", "list_referrals", "list_visits", "list_followups",
  "list_document_requests", "get_department_workflow", "get_providers", "check_trends", "search_audit_log"];
const PATIENT_READ = ["get_patient_summary", "get_clinical_notes", "search_patient_documents",
  "list_appointments", "list_visits", "list_followups", "list_document_requests", "get_providers"];

export function getToolset(ctx: ToolContext): AssistantTool[] {
  if (ctx.ownerType === "patient") {
    return [...readTools.filter((t) => PATIENT_READ.includes(t.name)), ...patientWriteTools];
  }
  return [...readTools.filter((t) => STAFF_READ.includes(t.name)), ...staffWriteTools];
}

export function toAnthropicTools(tools: AssistantTool[]) {
  // Note: the API caps `strict: true` tools at 20 and the staff toolset exceeds
  // that, so we rely on schema validation in each executor instead of strict mode.
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as { type: "object"; [k: string]: unknown },
  }));
}

export { ToolError };
