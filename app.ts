import express from 'express'
import { Request, Response } from 'express'
const app = express()

const PORT = 3000

app.post('/', async (req: Request, res: Response) => {
    res.send("Hello World")
})

app.listen(PORT, () => console.log(`Server iniciado em: http://localhost:${PORT}/`))