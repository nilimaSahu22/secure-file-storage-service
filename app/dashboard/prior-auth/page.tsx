import { getAllPriorAuths } from "@/lib/services/priorAuth";
import { PriorAuthListClient } from "@/components/dashboard/PriorAuthListClient";

export const dynamic = "force-dynamic";

export default async function PriorAuthPage() {
  const priorAuths = await getAllPriorAuths();
  return <PriorAuthListClient priorAuths={priorAuths} />;
}
