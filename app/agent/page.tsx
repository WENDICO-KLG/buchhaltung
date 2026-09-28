import { AgentChat } from "@/components/agent/agent-chat";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function AgentPage() {
  return <WorkspaceShell active="Agent" title="Wendico / Agent"><div className="page-enter"><AgentChat/></div></WorkspaceShell>;
}