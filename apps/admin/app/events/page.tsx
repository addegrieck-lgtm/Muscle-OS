import { ResourceList } from "@/components/ResourceList";
import { RESOURCES } from "@/lib/resources";

export default function Page() {
  return <ResourceList resource={RESOURCES.events!} />;
}
