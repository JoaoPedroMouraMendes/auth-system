import express from "express"
import cors from "cors"
import route from "./src/routes"

const app = express()
app.use(cors())
app.use(express.json())

app.use('/', route)

const PORT = 3000

app.listen(PORT, () => console.log(`Server iniciado em: http://localhost:${PORT}/`))