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

const DEFAULT_TITLES = new Set(["New conversation", "New chat"]);

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
  let title: string | undefined;

  if (threadParam) {
    const thread = await getThread(threadParam, owner);
    if (thread) {
      activeThreadId = thread.id;
      title = DEFAULT_TITLES.has(thread.title) ? undefined : thread.title;
      messages = await getThreadMessagesForView(thread.id);
    }
  }

  return (
    <div className="-m-6">
      <AssistantView
        ownerType="patient"
        withRail
        initialThreads={threads}
        activeThreadId={activeThreadId}
        initialMessages={messages}
        initialTitle={title}
        focusedPatient={null}
      />
    </div>
  );
}
