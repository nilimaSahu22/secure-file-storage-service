import { redirect } from "next/navigation";

// The assistant now lives in the docked panel (see AssistantDock / AssistantController).
export default function StaffAssistantRedirect() {
  redirect("/dashboard");
}
