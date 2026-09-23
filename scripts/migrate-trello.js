#!/usr/bin/env node
/**
 * Trello → Mission Control migration tool.
 *
 * Imports every open card on the VOID Ops board into MC's native tasks:
 *   - Trello lists  → task metadata (trello_list) + project mapping
 *   - Labels        → tags JSON array (+ priority/status mapping)
 *   - Comments      → comments table (author, content, created_at preserved)
 *   - Checklists    → task_checklists table
 *   - Due dates     → due_date
 *   - Provenance    → metadata.trello_card_id / trello_url for idempotency
 *
 * Idempotent: re-running updates existing imported tasks (matched by
 * trello_card_id in metadata) instead of duplicating.
 *
 * Usage: node scripts/migrate-trello.js --dry   (report only, no writes)
 *        node scripts/migrate-trello.js         (live import)
 */

const path = require('path')
const fs = require('fs')

// ---- Config ----
const BOARD_ID = '6a595669b8f8f99c93392f4f'
const MC_ROOT = path.join(__dirname, '..')
const DB_PATH = process.env.MC_DB_PATH || path.join(MC_ROOT, '.data', 'mission-control.db')

// Trello creds from vault secrets.env (never hardcode)
function loadTrelloCreds() {
  const secretsPath = 'C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/03_Business_Operations/_Hub/_KEY_VAULT/secrets.env'
  const lines = fs.readFileSync(secretsPath, 'utf-8').split(/\r?\n/)
  const key = (lines.find(l => l.startsWith('TRELLO_KEY=')) || '').split('=')[1]
  const token = (lines.find(l => l.startsWith('TRELLO_TOKEN=')) || '').split('=')[1]
  if (!key || !token) throw new Error('Trello creds not found in vault secrets.env')
  return { key, token }
}

// Trello list → MC project mapping
const LIST_PROJECT_MAP = {
  'PROJECT: tr3asure mAp': 'tr3asure mAp',
  "Pirate Captain's Mission Control": "Captain's Dashboard",
  'PROJECT: Crownless Fortune': 'Crownless Fortune',
}

// Trello list → MC status mapping
const LIST_STATUS_MAP = {
  'Done': 'done',
  'P0 - Critical': 'inbox',
  'P1 - High': 'inbox',
  'P2 - Medium': 'inbox',
  'P3 - Low': 'inbox',
  'P4 - Backlog': 'inbox',
  'To Do Next': 'inbox',
  'Top 10 — Focus Fleet': 'assigned',
}

// Priority label → MC priority
const LABEL_PRIORITY_MAP = {
  'P0': 'urgent',
  'P1': 'high',
  'P2': 'medium',
  'P3': 'low',
  'P4': 'low',
}

// Agent labels → assigned_to
const AGENT_LABELS = new Set(['sir-green', 'sir-cobalt', 'sir-violet', 'sir-azure', 'miss-pink', 'miss-blue', 'miss-orange', 'captain'])

let CREDS

async function trelloFetch(url) {
  const { key, token } = CREDS
  const sep = url.includes('?') ? '&' : '?'
  const resp = await fetch(`${url}${sep}key=${key}&token=${token}`)
  if (!resp.ok) throw new Error(`Trello ${resp.status}: ${url}`)
  return resp.json()
}

async function main() {
  const dry = process.argv.includes('--dry')
  CREDS = loadTrelloCreds()

  console.log(`=== Trello → MC Migration ${dry ? '(DRY RUN)' : '(LIVE)'} ===`)
  console.log(`DB: ${DB_PATH}`)

  const Database = require('better-sqlite3')
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  // 1. Fetch all lists + cards + labels + comments + checklists
  console.log('Fetching Trello board...')
  const lists = await trelloFetch(`https://api.trello.com/1/boards/${BOARD_ID}/lists?fields=id,name,closed`)
  const cards = await trelloFetch(`https://api.trello.com/1/boards/${BOARD_ID}/cards?fields=id,idShort,name,desc,closed,due,dateLastActivity,idList,labels,shortUrl,url&limit=1000`)

  const listById = new Map(lists.map(l => [l.id, l]))
  const openCards = cards.filter(c => !c.closed)
  console.log(`Board: ${lists.length} lists, ${cards.length} cards total, ${openCards.length} open`)

  // Resolve projects by name
  const projects = db.prepare('SELECT id, name FROM projects').all()
  const projectByName = new Map(projects.map(p => [p.name.toLowerCase(), p.id]))
  const defaultProject = projectByName.get('general')

  // Existing imports (idempotency): trello_card_id → task id
  const existing = new Map()
  for (const row of db.prepare("SELECT id, metadata FROM tasks WHERE metadata LIKE '%trello_card_id%'").all()) {
    try {
      const meta = JSON.parse(row.metadata)
      if (meta.trello_card_id) existing.set(meta.trello_card_id, row.id)
    } catch { /* skip */ }
  }
  console.log(`Existing imported tasks: ${existing.size}`)

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, created_at, updated_at, due_date, tags, metadata, workspace_id, project_id)
    VALUES (@title, @description, @status, @priority, @assigned_to, 'trello-migration', @created_at, @created_at, @due_date, @tags, @metadata, 1, @project_id)
  `)
  const updateTask = db.prepare(`
    UPDATE tasks SET title=@title, description=@description, status=@status, priority=@priority, assigned_to=@assigned_to, updated_at=strftime('%s','now'), due_date=@due_date, tags=@tags, metadata=@metadata, project_id=@project_id WHERE id=@id
  `)
  const insertComment = db.prepare(`
    INSERT INTO comments (task_id, author, content, created_at, workspace_id)
    VALUES (?, ?, ?, ?, 1)
  `)
  const insertChecklistItem = db.prepare(`
    INSERT INTO task_checklists (task_id, item_text, position, checked)
    VALUES (?, ?, ?, ?)
  `)
  const clearChecklist = db.prepare('DELETE FROM task_checklists WHERE task_id = ?')
  const clearComments = db.prepare("DELETE FROM comments WHERE task_id = ? AND author LIKE '%(trello)'")

  let created = 0, updated = 0, commentsAdded = 0, checklistItems = 0, errors = 0
  const statusCounts = {}, projectCounts = {}

  if (!dry) db.exec('BEGIN')

  let i = 0
  for (const card of openCards) {
    i++
    try {
      const list = listById.get(card.idList)
      const listName = list ? list.name : 'Unknown'
      const labels = (card.labels || []).map(l => l.name).filter(Boolean)
      const priority = labels.map(l => LABEL_PRIORITY_MAP[l]).find(Boolean) || 'medium'
      const agentLabel = labels.find(l => AGENT_LABELS.has(l.toLowerCase()))
      let status = LIST_STATUS_MAP[listName] || 'inbox'
      if (labels.includes('Done')) status = 'done'

      const projectName = LIST_PROJECT_MAP[listName]
      const projectId = (projectName && projectByName.get(projectName.toLowerCase())) || defaultProject

      const metadata = {
        trello_card_id: card.id,
        trello_id_short: card.idShort,
        trello_url: card.shortUrl,
        trello_list: listName,
        trello_list_id: card.idList,
        trello_labels_raw: (card.labels || []).map(l => ({ name: l.name, color: l.color })),
        migrated_at: new Date().toISOString(),
      }

      const task = {
        title: card.name,
        description: card.desc || null,
        status, priority,
        assigned_to: agentLabel || null,
        created_at: Math.floor(new Date(card.dateLastActivity).getTime() / 1000),
        due_date: card.due ? Math.floor(new Date(card.due).getTime() / 1000) : null,
        tags: JSON.stringify(labels),
        metadata: JSON.stringify(metadata),
        project_id: projectId,
      }

      let taskId
      const existingId = existing.get(card.id)
      if (existingId) {
        if (!dry) {
          task.id = existingId
          updateTask.run(task)
          clearComments.run(taskId)
          clearChecklist.run(taskId)
        }
        taskId = existingId
        updated++
      } else {
        if (!dry) {
          const result = insertTask.run(task)
          taskId = result.lastInsertRowid
        }
        created++
      }

      statusCounts[status] = (statusCounts[status] || 0) + 1
      projectCounts[projectName || 'General'] = (projectCounts[projectName || 'General'] || 0) + 1

      // Comments
      const actions = await trelloFetch(`https://api.trello.com/1/cards/${card.id}/actions?filter=commentCard&fields=data,date&limit=1000`)
      for (const a of actions.reverse()) {
        const who = a.data?.memberCreator?.username || 'trello'
        const text = a.data?.text || ''
        if (text && !dry) {
          insertComment.run(taskId, `${who} (trello)`, text, Math.floor(new Date(a.date).getTime() / 1000))
        }
        if (text) commentsAdded++
      }

      // Checklists
      const checklists = await trelloFetch(`https://api.trello.com/1/cards/${card.id}/checklists?fields=name&checkItems=all`)
      let pos = 0
      for (const cl of checklists) {
        for (const item of (cl.checkItems || [])) {
          if (!dry) insertChecklistItem.run(taskId, item.name, pos++, item.state === 'complete' ? 1 : 0)
          checklistItems++
        }
      }

      if (i % 50 === 0) console.log(`  ${i}/${openCards.length}...`)

    } catch (err) {
      errors++
      console.error(`  ERROR card ${card.idShort} "${card.name}": ${err.message}`)
    }
  }

  if (!dry) db.exec('COMMIT')

  console.log('\n=== MIGRATION SUMMARY ===')
  console.log(`Cards: ${created} created, ${updated} updated, ${errors} errors (expected: ${openCards.length} total)`)
  console.log(`Comments: ${commentsAdded} (expected: 3,620)`)
  console.log(`Checklist items: ${checklistItems} (expected: 116)`)
  console.log('Status distribution:', JSON.stringify(statusCounts))
  console.log('Project distribution:', JSON.stringify(projectCounts))

  // Verification queries
  const totalTasks = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE metadata LIKE '%trello_card_id%'").get()
  const totalComments = db.prepare("SELECT COUNT(*) as n FROM comments WHERE author LIKE '%(trello)'").get()
  const totalChecklist = db.prepare('SELECT COUNT(*) as n FROM task_checklists').get()
  console.log('\n=== DB VERIFICATION ===')
  console.log(`tasks with trello_card_id: ${totalTasks.n}`)
  console.log(`trello comments: ${totalComments.n}`)
  console.log(`checklist items: ${totalChecklist.n}`)

  if (dry) {
    console.log('\nDRY RUN complete. No writes. Run without --dry to apply.')
  } else {
    console.log('\nMigration committed.')
  }

  db.close()
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
