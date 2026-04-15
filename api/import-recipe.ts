import type { VercelRequest, VercelResponse } from '@vercel/node'

function parseIsoDuration(iso: string): number {
  const match = iso.match(/P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:[\d.]+S)?/)
  if (!match) return 0
  return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0')
}

function extractImage(image: unknown): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return extractImage(image[0])
  if (typeof image === 'object' && image !== null && 'url' in image) return (image as { url: string }).url
  return null
}

function extractPortions(yieldVal: unknown): number | null {
  if (!yieldVal) return null
  const raw = Array.isArray(yieldVal) ? yieldVal[0] : yieldVal
  const num = parseInt(String(raw))
  return isNaN(num) ? null : num
}

function extractSteps(instructions: unknown): string[] {
  if (!instructions) return []
  const items = Array.isArray(instructions) ? instructions : [instructions]
  const steps: string[] = []
  for (const item of items) {
    if (typeof item === 'string') {
      steps.push(item.trim())
    } else if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>
      if (obj['@type'] === 'HowToSection' && Array.isArray(obj.itemListElement)) {
        steps.push(...extractSteps(obj.itemListElement))
      } else if (obj.text) {
        steps.push(String(obj.text).trim())
      } else if (obj.name) {
        steps.push(String(obj.name).trim())
      }
    }
  }
  return steps.filter(Boolean)
}

function extractTags(recipe: Record<string, unknown>): string[] {
  const raw = recipe.keywords || recipe.recipeCategory || recipe.recipeCuisine || ''
  const items = Array.isArray(raw) ? raw : String(raw).split(/[,;]/)
  return items.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 5)
}

function findRecipe(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipe(item)
      if (found) return found
    }
    return null
  }
  const obj = data as Record<string, unknown>
  const type = obj['@type']
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj
  }
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    return findRecipe(obj['@graph'])
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL required' })

  let html: string
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeImporter/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    html = await response.text()
  } catch (err) {
    return res.status(422).json({ error: `Could not fetch page: ${(err as Error).message}` })
  }

  const scriptMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]

  let recipe: Record<string, unknown> | null = null
  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1].trim())
      recipe = findRecipe(parsed)
      if (recipe) break
    } catch {}
  }

  if (!recipe) return res.status(404).json({ error: 'No recipe data found on this page' })

  return res.json({
    title: recipe.name ? String(recipe.name) : '',
    ingredients: Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient.map((i: unknown) => String(i).trim())
      : [],
    steps: extractSteps(recipe.recipeInstructions),
    tags: extractTags(recipe),
    notes: recipe.description ? String(recipe.description).trim() : '',
    photo_url: extractImage(recipe.image),
    source_url: url,
    portions: extractPortions(recipe.recipeYield),
    prep_time_mins: recipe.prepTime ? parseIsoDuration(String(recipe.prepTime)) : null,
    cook_time_mins: recipe.cookTime ? parseIsoDuration(String(recipe.cookTime)) : null,
  })
}
