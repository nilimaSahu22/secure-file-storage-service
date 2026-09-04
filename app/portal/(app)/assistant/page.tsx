import { redirect } from "next/navigation";

// The portal assistant now opens as the docked panel (see PortalShell / AssistantDock).
export default function PortalAssistantRedirect() {
  redirect("/portal");
}
