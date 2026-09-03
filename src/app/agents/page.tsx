'use client'

import { AgentSquadPanelPhase3 } from '@/components/panels/agent-squad-panel-phase3'
import { OrchestrationBar } from '@/components/panels/orchestration-bar'

export default function AgentsPage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        <OrchestrationBar />
        <AgentSquadPanelPhase3 />
      </div>
    </div>
  )
}
