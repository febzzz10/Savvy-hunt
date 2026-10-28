import type { Id } from "@/convex/_generated/dataModel";
import { AdminEventView } from "./view";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <AdminEventView eventId={eventId as Id<"events">} />;
}
