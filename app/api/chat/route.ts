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
      max_tokens: 1500,
      system,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3
        }
      ],
      messages: messages
        .filter((m: {role: string}) => m.role !== 'system')
        .map((m: {role: string; content: string}) => ({
          role: m.role,
          content: m.content,
        })),
    }),
  })

  const data = await response.json()
  
  // Extract text from potentially multi-block response (web search returns mixed blocks)
  let content = ''
  if (data.content && Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text') {
        content += block.text
      }
    }
  }
  if (!content) content = 'Sorry, I could not generate a response.'
  
  return NextResponse.json({ content })
}
