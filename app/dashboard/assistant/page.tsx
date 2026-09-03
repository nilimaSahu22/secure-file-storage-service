import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientBasic } from "@/lib/services/patients";
import { getThread, getThreadMessages, listThreads } from "@/lib/services/assistant";
import { AssistantView, type AssistantMessageView, type ThreadSummary } from "@/components/assistant/AssistantView";

export const dynamic = "force-dynamic";

export default async function StaffAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; patient?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.type !== "staff") redirect("/login");
  const owner = { type: "staff" as const, id: session.user.id };
  const { thread: threadParam, patient: patientParam } = await searchParams;

  const threads = (await listThreads(owner)) as ThreadSummary[];

  let activeThreadId: string | null = null;
  let messages: AssistantMessageView[] = [];
  let focusedPatientId: string | null = patientParam ?? null;

  if (threadParam) {
    const thread = await getThread(threadParam, owner);
    if (thread) {
      activeThreadId = thread.id;
      focusedPatientId = thread.focusedPatientId;
      messages = (await getThreadMessages(thread.id)).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        citedFileIds: m.citedFileIds,
      }));
    }
  }

  let focusedPatient: { id: string; name: string } | null = null;
  if (focusedPatientId) {
    const p = await getPatientBasic(focusedPatientId);
    if (p) focusedPatient = { id: p.id, name: `${p.firstName} ${p.lastName}` };
  }

  return (
    <div className="p-6 max-[520px]:p-3 [--assistant-chrome:8.5rem]">
      <AssistantView
        ownerType="staff"
        initialThreads={threads}
        activeThreadId={activeThreadId}
        initialMessages={messages}
        focusedPatient={focusedPatient}
      />
    </div>
  );
}
