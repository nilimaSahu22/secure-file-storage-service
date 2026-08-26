import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminResetClient } from "@/components/dashboard/AdminResetClient";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminResetClient />;
}
