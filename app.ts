import express from "express"
import cors from "cors"
import route from "./src/routes"
import path from "path"

const app = express()
app.use(cors())
app.use(express.json())
// Configurando o diretório de visualizações
app.set('views', path.join(`${__dirname}/src`, 'views'));
// Configurando o mecanismo de visualização para EJS
app.set('view engine', 'ejs');

app.use('/', route)

const PORT = 3000

app.listen(PORT, () => console.log(`Server iniciado em: http://localhost:${PORT}/`))