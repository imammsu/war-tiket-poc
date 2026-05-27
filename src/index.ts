import express from 'express'

const app = express()
app.use(express.json())

const PORT = 3000

app.get('/', (req, res) => {
  res.json({ message: 'War Tiket PoC - Running' })
})

app.listen(PORT, () => {
  console.log(`[SERVER] Berjalan di http://localhost:${PORT}`)
})

export default app