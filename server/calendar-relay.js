import express from 'express'

// Relais minimal : Google ne renvoie aucun header CORS sur les flux ICS, donc
// le navigateur ne peut pas les lire directement. Ce serveur fait la requête
// à la place du navigateur (CORS ne s'applique qu'aux appels JS depuis un
// navigateur, jamais aux appels serveur-à-serveur) et renvoie le résultat
// avec un CORS permissif pour notre front.
//
// Restreint à calendar.google.com pour éviter d'exposer un proxy HTTP ouvert
// vers n'importe quelle URL publique.

const PORT = process.env.PORT || 3002
const ALLOWED_HOST = 'calendar.google.com'

const app = express()

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

app.get('/api/calendar-proxy', async (req, res) => {
  const target = req.query.url
  if (typeof target !== 'string') {
    return res.status(400).json({ error: 'Paramètre "url" manquant' })
  }

  let parsed
  try {
    parsed = new URL(target)
  } catch {
    return res.status(400).json({ error: 'URL invalide' })
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return res.status(400).json({ error: `Seul ${ALLOWED_HOST} est autorisé` })
  }

  try {
    const upstream = await fetch(parsed.toString())
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Google a répondu ${upstream.status}` })
    }
    const body = await upstream.text()
    res.header('Content-Type', 'text/calendar; charset=utf-8')
    res.send(body)
  } catch (err) {
    console.error('[calendar-relay] échec de la requête vers Google', err)
    res.status(502).json({ error: 'Échec de la requête vers Google Calendar' })
  }
})

app.get('/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Relais calendrier en écoute sur http://localhost:${PORT}`)
})
