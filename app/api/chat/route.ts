import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages, system } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages: messages.filter((m: {role: string}) => m.role !== 'system').map((m: {role: string, content: string}) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  const data = await response.json()
  const content = data.content?.[0]?.text || 'Sorry, I could not generate a response.'
  return NextResponse.json({ content })
}
