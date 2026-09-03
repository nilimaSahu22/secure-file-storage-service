import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getThread, getThreadMessages, listThreads } from "@/lib/services/assistant";
import { AssistantView, type AssistantMessageView, type ThreadSummary } from "@/components/assistant/AssistantView";

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
      messages = (await getThreadMessages(thread.id)).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        citedFileIds: m.citedFileIds,
      }));
    }
  }

  return (
    <div className="[--assistant-chrome:9rem]">
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
