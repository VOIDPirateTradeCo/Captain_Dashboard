import { eventBus } from '@/lib/event-bus'
import { getDatabase } from '@/lib/db'
import { queryPendingAssignments } from './adapter'
import type { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

/**
 * VOID fix: the base GenericAdapter only broadcast an eventBus message on
 * register / heartbeat / disconnect and never touched the `agents` table, so
 * `agents.status` / `agents.last_seen` stayed stale and the MC UI showed every
 * pull-model agent as "offline" even with an active adapter connection.
 * `agentId` from the pull loop is the agent NAME (matches `agents.name UNIQUE`).
 */
function markAgent(agentName: string, status: string): void {
  try {
    if (!agentName) return
    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)
    db.prepare(
      `UPDATE agents SET status = ?, last_seen = ?, updated_at = ? WHERE name = ?`,
    ).run(status, now, now, agentName)
  } catch {
    // best-effort — a heartbeat must never fail on a bookkeeping write
  }
}

export class GenericAdapter implements FrameworkAdapter {
  readonly framework = 'generic'

  async register(agent: AgentRegistration): Promise<void> {
    markAgent(agent.agentId, 'online')
    eventBus.broadcast('agent.created', {
      workspace_id: agent.workspaceId,
      id: agent.agentId,
      name: agent.name,
      framework: agent.framework || this.framework,
      status: 'online',
      ...(agent.metadata ?? {}),
    })
  }

  async heartbeat(payload: HeartbeatPayload): Promise<void> {
    markAgent(payload.agentId, payload.status || 'online')
    eventBus.broadcast('agent.status_changed', {
      workspace_id: payload.workspaceId,
      id: payload.agentId,
      status: payload.status,
      metrics: payload.metrics ?? {},
      framework: this.framework,
    })
  }

  async reportTask(report: TaskReport): Promise<void> {
    eventBus.broadcast('task.updated', {
      workspace_id: report.workspaceId,
      id: report.taskId,
      agentId: report.agentId,
      progress: report.progress,
      status: report.status,
      output: report.output,
      framework: this.framework,
    })
  }

  async getAssignments(agentId: string, workspaceId: number): Promise<Assignment[]> {
    return queryPendingAssignments(agentId, workspaceId)
  }

  async disconnect(agentId: string, workspaceId: number): Promise<void> {
    markAgent(agentId, 'offline')
    eventBus.broadcast('agent.status_changed', {
      workspace_id: workspaceId,
      id: agentId,
      status: 'offline',
      framework: this.framework,
    })
  }
}
