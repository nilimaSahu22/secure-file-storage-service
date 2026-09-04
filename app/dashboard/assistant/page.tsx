import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientBasic } from "@/lib/services/patients";
import { getThread, getThreadMessagesForView, type AssistantMessageView } from "@/lib/services/assistant";
import { AssistantView } from "@/components/assistant/AssistantView";

export const dynamic = "force-dynamic";

const DEFAULT_TITLES = new Set(["New conversation", "New chat"]);

export default async function StaffAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; patient?: string; fresh?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.type !== "staff") redirect("/login");
  const owner = { type: "staff" as const, id: session.user.id };
  const { thread: threadParam, patient: patientParam, fresh } = await searchParams;

  let activeThreadId: string | null = null;
  let messages: AssistantMessageView[] = [];
  let title: string | undefined;
  let focusedPatientId: string | null = patientParam ?? null;

  if (threadParam) {
    const thread = await getThread(threadParam, owner);
    if (thread) {
      activeThreadId = thread.id;
      focusedPatientId = thread.focusedPatientId;
      title = DEFAULT_TITLES.has(thread.title) ? undefined : thread.title;
      messages = await getThreadMessagesForView(thread.id);
    }
  }

  let focusedPatient: { id: string; name: string } | null = null;
  if (focusedPatientId) {
    const p = await getPatientBasic(focusedPatientId);
    if (p) focusedPatient = { id: p.id, name: `${p.firstName} ${p.lastName}` };
  }

  return (
    <AssistantView
      key={fresh ?? "assistant"}
      ownerType="staff"
      activeThreadId={activeThreadId}
      initialMessages={messages}
      initialTitle={title}
      focusedPatient={focusedPatient}
    />
  );
}
