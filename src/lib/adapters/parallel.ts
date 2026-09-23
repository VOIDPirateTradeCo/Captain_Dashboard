import { queryPendingAssignments } from './adapter'
import type { FrameworkAdapter, Assignment } from './adapter'

export class ParallelCliAdapter implements FrameworkAdapter {
  readonly framework = 'parallel'

  async register(_agent: Parameters<FrameworkAdapter['register']>[0]): Promise<void> {
    // Parallel CLI self-registers via heartbeat
  }

  async heartbeat(_payload: Parameters<FrameworkAdapter['heartbeat']>[0]): Promise<void> {
    // Parallel CLI sends heartbeats via the agent heartbeat API
  }

  async reportTask(_report: Parameters<FrameworkAdapter['reportTask']>[0]): Promise<void> {
    // Parallel CLI reports via the agent task report API
  }

  async getAssignments(agentId: string, workspaceId: number): Promise<Assignment[]> {
    return queryPendingAssignments(agentId, workspaceId)
  }

  async disconnect(_agentId: string, _workspaceId: number): Promise<void> {
    // Parallel CLI disconnect handled by agent status update
  }
}
