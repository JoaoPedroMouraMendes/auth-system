import * as jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

class TokenHandler {
    // Gera um token
    generateToken(data: object, options?: jwt.SignOptions) {
        const SECRET = process.env.SECRET as string
        const token = jwt.sign(data, SECRET, options)
        return token
    }
}

export default new TokenHandler()