import { WorkspaceIndexClient } from "@/components/workspace-index-client";
import { workspaces } from "@/lib/mock-data";

export default function WorkspacesPage() {
  return <WorkspaceIndexClient baseWorkspaces={workspaces.map(({ activeTaskId, context, materials, tasks, ...workspace }) => ({ ...workspace, isDemo: true }))} />;
}
