import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientBasic } from "@/lib/services/patients";
import {
  getThread,
  getThreadMessagesForView,
  listThreads,
  type AssistantMessageView,
} from "@/lib/services/assistant";
import { AssistantView, type ThreadSummary } from "@/components/assistant/AssistantView";

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
      messages = await getThreadMessagesForView(thread.id);
    }
  }

  let focusedPatient: { id: string; name: string } | null = null;
  if (focusedPatientId) {
    const p = await getPatientBasic(focusedPatientId);
    if (p) focusedPatient = { id: p.id, name: `${p.firstName} ${p.lastName}` };
  }

  return (
    <div className="[--assistant-chrome:3.25rem] max-[1200px]:[--assistant-chrome:3.5rem]">
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
