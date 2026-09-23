import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('requeueOrphanedInProgressTasks - SQL pattern audit', () => {
  it('queries in_progress AND quality_review tasks', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedInProgressTasks')
    // Boundary: start of the NEXT function's JSDoc comment (avoids capturing its text)
    const end = dispatch.indexOf('/**\n * Catch assigned tasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain("status IN ('in_progress', 'quality_review')")
    expect(fn).toContain('updated_at < ?')
    expect(fn).not.toContain('JOIN agents')
    expect(fn).not.toContain('agent_status')
  })

  it('routes quality_review orphans back to review', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedInProgressTasks')
    const end = dispatch.indexOf('/**\n * Catch assigned tasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain("revertStatus = isQualityReview ? 'review' : 'assigned'")
    expect(fn).toContain('Aegis likely died mid-review')
  })

  it('uses max 5 retries for in_progress, 3 for quality_review', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedInProgressTasks')
    const end = dispatch.indexOf('/**\n * Catch assigned tasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain('maxDispatchRetries = 5')
    expect(fn).toContain('maxAegisRetries = 3')
  })

  it('increments dispatch_attempts on each requeue cycle', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedInProgressTasks')
    const end = dispatch.indexOf('/**\n * Catch assigned tasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain('currentAttempts + 1')
    expect(fn).toContain('newAttempts')
  })

  it('adds a comment explaining the requeue', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedInProgressTasks')
    const end = dispatch.indexOf('/**\n * Catch assigned tasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain('INSERT INTO comments')
    expect(fn).toContain("'scheduler'")
  })

  it('broadcasts task.status_changed with reason orphaned_task_requeue', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedInProgressTasks')
    const end = dispatch.indexOf('/**\n * Catch assigned tasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain('orphaned_task_requeue')
    expect(fn).toContain('orphaned_task_max_retries')
  })

  it('optimistic concurrency guard on UPDATE uses status parameter', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedInProgressTasks')
    const end = dispatch.indexOf('/**\n * Catch assigned tasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toMatch(/WHERE id = \? AND workspace_id = \? AND status = \?/)
  })
})

describe('orphaned recovery scheduler wiring', () => {
  it('registers both orphaned task recovery tasks as always-enabled', () => {
    const scheduler = source('src/lib/scheduler.ts')
    expect(scheduler).toContain("'orphaned_task_recovery'")
    expect(scheduler).toContain("'orphaned_assigned_recovery'")
    expect(scheduler).toContain('Orphaned Task Recovery')
    expect(scheduler).toContain('Orphaned Assigned Recovery')
    expect(scheduler).toContain('alwaysEnabled')
  })

  it('imports both recovery functions from task-dispatch', () => {
    const scheduler = source('src/lib/scheduler.ts')
    expect(scheduler).toContain('requeueOrphanedInProgressTasks')
    expect(scheduler).toContain('requeueOrphanedAssignedTasks')
  })

  it('wires both functions into the tick handler', () => {
    const scheduler = source('src/lib/scheduler.ts')
    expect(scheduler).toContain(': id === \'orphaned_task_recovery\'')
    expect(scheduler).toContain(': id === \'orphaned_assigned_recovery\'')
  })
})

describe('requeueOrphanedAssignedTasks - SQL pattern audit', () => {
  it('queries assigned tasks with missing agent row', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedAssignedTasks')
    const end = dispatch.indexOf('export async function dispatchAssignedTasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain("status = 'assigned'")
    expect(fn).toContain('LEFT JOIN agents a ON a.name = t.assigned_to')
    expect(fn).toContain('a.id IS NULL')
    expect(fn).toContain('updated_at < ?')
  })

  it('routes assigned orphans back to inbox for re-assignment', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedAssignedTasks')
    const end = dispatch.indexOf('export async function dispatchAssignedTasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain("'inbox'")
    expect(fn).toContain('assigned_to = NULL')
    expect(fn).toContain('no longer exists')
  })

  it('adds a comment explaining the re-route', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedAssignedTasks')
    const end = dispatch.indexOf('export async function dispatchAssignedTasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain('INSERT INTO comments')
    expect(fn).toContain("'scheduler'")
  })

  it('broadcasts task.status_changed with reason orphaned_assigned_agent_missing', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedAssignedTasks')
    const end = dispatch.indexOf('export async function dispatchAssignedTasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toContain('orphaned_assigned_agent_missing')
  })

  it('optimistic concurrency guard on UPDATE matches assigned status', () => {
    const dispatch = source('src/lib/task-dispatch.ts')
    const start = dispatch.indexOf('export async function requeueOrphanedAssignedTasks')
    const end = dispatch.indexOf('export async function dispatchAssignedTasks')
    const fn = dispatch.slice(start, end)

    expect(fn).toMatch(/WHERE id = \? AND workspace_id = \? AND status = 'assigned'/)
  })
})
