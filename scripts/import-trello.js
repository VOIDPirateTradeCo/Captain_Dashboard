#!/usr/bin/env node
/**
 * Phase B: Import Trello JSON export into Mission Control.
 * Reads tmp/trello-export/ from export-trello.js.
 *
 * Usage: node scripts/import-trello.js --dry    (report only)
 *        node scripts/import-trello.js          (live import)
 */

const path = require('path')
const fs = require('fs')

const MC_ROOT = path.join(__dirname, '..')
const DB_PATH = process.env.MC_DB_PATH || path.join(MC_ROOT, '.data', 'mission-control.db')
const EXPORT_DIR = path.join(MC_ROOT, 'tmp', 'trello-export')

const LIST_PROJECT_MAP = {
  'PROJECT: tr3asure mAp': 'tr3asure mAp',
  "Pirate Captain's Mission Control": "Captain's Dashboard",
  'PROJECT: Crownless Fortune': 'Crownless Fortune',
}

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

const LABEL_PRIORITY_MAP = {
  'P0': 'urgent',
  'P1': 'high',
  'P2': 'medium',
  'P3': 'low',
  'P4': 'low',
}

const AGENT_LABELS = new Set(['sir-green', 'sir-cobalt', 'sir-violet', 'sir-azure', 'miss-pink', 'miss-blue', 'miss-orange', 'captain'])

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, name), 'utf-8'))
}

async function main() {
  const dry = process.argv.includes('--dry')
  console.log(`=== Trello Import ${dry ? '(DRY RUN)' : '(LIVE)'} ===`)

  const Database = require('better-sqlite3')
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  console.log('Loading export...')
  const lists = loadJson('lists.json')
  const cards = loadJson('cards.json')
  const allComments = loadJson('comments.json')
  const allChecklists = loadJson('checklists.json')

  const listById = new Map(lists.map(l => [l.id, l]))
  const openCards = cards.filter(c => !c.closed)

  const projects = db.prepare('SELECT id, name FROM projects').all()
  const projectByName = new Map(projects.map(p => [p.name.toLowerCase(), p.id]))
  const defaultProject = projectByName.get('general') || 1

  const existing = new Map()
  for (const row of db.prepare("SELECT id, metadata FROM tasks WHERE metadata LIKE '%trello_card_id%'").all()) {
    try {
      const meta = JSON.parse(row.metadata)
      if (meta.trello_card_id) existing.set(meta.trello_card_id, row.id)
    } catch { /* skip */ }
  }
  console.log(`Existing imports: ${existing.size}, cards to import: ${openCards.length}`)

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, created_at, updated_at, due_date, tags, metadata, workspace_id, project_id)
    VALUES (@title, @description, @status, @priority, @assigned_to, 'trello-migration', @created_at, @created_at, @due_date, @tags, @metadata, 1, @project_id)
  `)
  const updateTask = db.prepare(`
    UPDATE tasks SET title=@title, description=@description, status=@status, priority=@priority, assigned_to=@assigned_to, updated_at=strftime('%s','now'), due_date=@due_date, tags=@tags, metadata=@metadata, project_id=@project_id WHERE id=@id
  `)
  const insertComment = db.prepare(`INSERT INTO comments (task_id, author, content, created_at, workspace_id) VALUES (?, ?, ?, ?, 1)`)
  const insertChecklist = db.prepare(`INSERT INTO task_checklists (task_id, item_text, position, checked) VALUES (?, ?, ?, ?)`)
  const clearChecklist = db.prepare('DELETE FROM task_checklists WHERE task_id = ?')
  const clearComments = db.prepare("DELETE FROM comments WHERE task_id = ? AND author LIKE '%(trello)'")

  let created = 0, updated = 0, commentsAdded = 0, checklistItems = 0, errors = 0
  const statusCounts = {}, projectCounts = {}

  if (!dry) db.exec('BEGIN')

  for (const card of openCards) {
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
          clearComments.run(existingId)
          clearChecklist.run(existingId)
        }
        taskId = existingId
        updated++
      } else {
        if (!dry) {
          const result = insertTask.run(task)
          taskId = result.lastInsertRowid
        } else {
          taskId = -1
        }
        created++
      }

      statusCounts[status] = (statusCounts[status] || 0) + 1
      projectCounts[projectName || 'General'] = (projectCounts[projectName || 'General'] || 0) + 1

      // Comments
      const cardComments = allComments[card.id] || []
      for (const a of cardComments.reverse()) {
        const who = a.data?.memberCreator?.username || 'trello'
        const text = a.data?.text || ''
        if (text && !dry && taskId > 0) {
          insertComment.run(taskId, `${who} (trello)`, text, Math.floor(new Date(a.date).getTime() / 1000))
        }
        if (text) commentsAdded++
      }

      // Checklists
      const cardChecklists = allChecklists[card.id] || []
      let pos = 0
      for (const cl of cardChecklists) {
        for (const item of (cl.checkItems || [])) {
          if (!dry && taskId > 0) {
            insertChecklist.run(taskId, item.name, pos++, item.state === 'complete' ? 1 : 0)
          }
          checklistItems++
        }
      }

    } catch (err) {
      errors++
      console.error(`  ERROR card ${card.idShort} "${card.name}": ${err.message}`)
    }
  }

  if (!dry) db.exec('COMMIT')

  console.log('\n=== IMPORT SUMMARY ===')
  console.log(`Cards: ${created} created, ${updated} updated, ${errors} errors (expected: ${openCards.length})`)
  console.log(`Comments: ${commentsAdded} (expected: 3,150 exported)`)
  console.log(`Checklist items: ${checklistItems} (expected: 106 exported)`)
  console.log('Status:', JSON.stringify(statusCounts))
  console.log('Projects:', JSON.stringify(projectCounts))

  const t1 = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE metadata LIKE '%trello_card_id%'").get()
  const t2 = db.prepare("SELECT COUNT(*) as n FROM comments WHERE author LIKE '%(trello)'").get()
  const t3 = db.prepare('SELECT COUNT(*) as n FROM task_checklists').get()
  console.log('\nDB verify:', `tasks=${t1.n}, comments=${t2.n}, checklists=${t3.n}`)
  console.log(dry ? '\nDRY RUN. No writes.' : '\nCommitted.')
  db.close()
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
