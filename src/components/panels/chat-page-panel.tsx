'use client'

import { ChatWorkspace } from '@/components/chat/chat-workspace'

export function ChatPagePanel() {
  return (
    <div className="m-4 h-[calc(100vh-8.75rem)] min-h-[560px] overflow-hidden rounded-lg border border-border bg-card" role="region" aria-label="Chat Page">
      <ChatWorkspace mode="embedded" />
    </div>
  )
}
