import * as jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

class TokenHandler {
    SECRET = process.env.SECRET as string

    // Gera um token
    generateToken(data: object, options?: jwt.SignOptions) {
        const token = jwt.sign(data, this.SECRET, options)
        return token
    }

    // Verifica se o token é valido
    verifyToken(token: string, callback?: jwt.VerifyCallback<string | jwt.JwtPayload>) {
        jwt.verify(token, this.SECRET, callback)
    }
}

export default new TokenHandler()