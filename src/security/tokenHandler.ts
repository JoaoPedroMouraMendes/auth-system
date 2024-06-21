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
        if (!token) throw new Error('UNDEFINED_TOKEN')
        else if (token.length === 0) throw new Error('EMPTY_TOKEN')
        jwt.verify(token, this.SECRET, callback)
    }

    // Retorna o token
    extractAuthToken(authorization: string): string {
        if (!authorization)
            throw new Error('EMPTY_AUTHORIZATION')
        const token = authorization.split(' ')[1]
        if (!token)
            throw new Error('EMPTY_TOKEN')
        return token
    }
}

export default new TokenHandler()