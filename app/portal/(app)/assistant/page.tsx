import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getThread,
  getThreadMessagesForView,
  listThreads,
  type AssistantMessageView,
} from "@/lib/services/assistant";
import { AssistantView, type ThreadSummary } from "@/components/assistant/AssistantView";

export const dynamic = "force-dynamic";

export default async function PortalAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");
  const owner = { type: "patient" as const, id: session.user.id };
  const { thread: threadParam } = await searchParams;

  const threads = (await listThreads(owner)) as ThreadSummary[];

  let activeThreadId: string | null = null;
  let messages: AssistantMessageView[] = [];

  if (threadParam) {
    const thread = await getThread(threadParam, owner);
    if (thread) {
      activeThreadId = thread.id;
      messages = await getThreadMessagesForView(thread.id);
    }
  }

  return (
    <div className="-mx-6 -mb-6">
      <AssistantView
        ownerType="patient"
        initialThreads={threads}
        activeThreadId={activeThreadId}
        initialMessages={messages}
        focusedPatient={null}
      />
    </div>
  );
}
