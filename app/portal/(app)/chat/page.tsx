import { redirect } from "next/navigation";

// The patient chat is now the full "Assistant" tab.
export default function PortalChatRedirect() {
  redirect("/portal/assistant");
}
