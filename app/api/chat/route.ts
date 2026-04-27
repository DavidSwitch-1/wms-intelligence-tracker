import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages, system } = await req.json()

  // Use Claude with web_search tool so it can verify and find new info
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3
        }
      ],
      messages: messages
        .filter((m: {role: string}) => m.role === 'user' || m.role === 'assistant')
        .map((m: {role: string, content: string}) => ({ role: m.role, content: m.content }))
    })
  })

  const data = await response.json()

  // Concatenate text from potentially multi-block response
  let content = ''
  if (data.content && Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text') {
        content += block.text
      }
    }
  }

  // Fallbacks when no text is produced
  if (!content) {
    if (data.error) {
      content = 'AI assistant error: ' + (data.error.message || 'unknown')
    } else if (data.stop_reason === 'max_tokens') {
      content = 'Ran out of room before I could write the answer. Try a more specific question, or phrase it without web search cues like "latest" / "recent".'
    } else if (Array.isArray(data.content) && data.content.some((b: any) => b.type === 'server_tool_use' || b.type === 'web_search_tool_result')) {
      content = 'I searched the web but the response was cut off before the final answer. Try a more focused question, or ask without web search ("based on the database, ...").'
    } else {
      content = 'No response (stop_reason: ' + (data.stop_reason || 'unknown') + ')'
    }
  }

  return NextResponse.json({ content })
}
