import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function fetchVideoData(videoId: string): Promise<{ title: string; description: string }> {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const html = await response.text()

  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  const rawTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, '').trim() : ''

  const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)
  if (!descMatch) throw new Error('Could not find video description')

  const description = descMatch[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  return { title: rawTitle, description }
}

const SYSTEM_PROMPT = `You extract recipe information from YouTube video descriptions. Return valid JSON only, no markdown.

Output format:
{
  "title": "Recipe name",
  "ingredients": ["200g pasta", "2 cloves garlic"],
  "steps": ["Boil salted water", "Cook pasta until al dente"],
  "tags": ["italian", "pasta", "dinner"],
  "notes": "tips or null",
  "portions": 4,
  "prep_time_mins": 15,
  "cook_time_mins": 30
}

Rules:
- ingredients: one string per ingredient including quantity and unit
- steps: clear action sentences, one per string, in order
- tags: max 5, lowercase (e.g. "italian", "vegetarian", "quick")
- portions, prep_time_mins, cook_time_mins: use null if not mentioned
- If no recipe exists in the description, return {"error": "No recipe found in description"}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL required' })

  const videoId = extractVideoId(url)
  if (!videoId) return res.status(400).json({ error: 'Not a valid YouTube URL' })

  let videoData: { title: string; description: string }
  try {
    videoData = await fetchVideoData(videoId)
  } catch (err) {
    return res.status(422).json({ error: `Could not fetch video: ${(err as Error).message}` })
  }

  if (!videoData.description.trim()) {
    return res.status(404).json({ error: 'This video has no description to extract a recipe from' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'YouTube import is not configured (missing ANTHROPIC_API_KEY)' })

  const client = new Anthropic({ apiKey })

  let recipe: Record<string, unknown>
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Video title: ${videoData.title}\n\nDescription:\n${videoData.description}`,
      }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonText = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    recipe = JSON.parse(jsonText)
  } catch (err) {
    return res.status(500).json({ error: `Recipe extraction failed: ${(err as Error).message}` })
  }

  if (recipe.error) {
    return res.status(404).json({ error: String(recipe.error) })
  }

  return res.json({
    title: recipe.title ?? videoData.title,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    notes: recipe.notes ?? null,
    portions: recipe.portions ?? null,
    prep_time_mins: recipe.prep_time_mins ?? null,
    cook_time_mins: recipe.cook_time_mins ?? null,
    photo_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    source_url: url,
  })
}
