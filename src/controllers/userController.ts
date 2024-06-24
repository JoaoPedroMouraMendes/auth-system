import { Request, Response } from "express"
import userService from "../services/userService"
import passwordValidator from "../validators/passwordValidator"
import Feedback from "../utils/feedback"
import emailValidator from "../validators/emailValidator"
import encryptData from "../security/encryptData"
import dotenv from "dotenv"
import tokenHandler from "../security/tokenHandler"

dotenv.config()

interface CreateUserBody {
    name: string
    email: string
    password: string
}

interface UserLoginBody {
    email: string
    password: string
}

class UserController {
    // Retorna o usuário
    async getUser(req: Request, res: Response): Promise<Response | void> {
        try {
            const userId = req.params.id
            // Obtem o usuário caso exista e o id seja valido
            const user = await userService.getUser({ id: userId })

            return res.status(200).json({ feedback: new Feedback(true), user })
        } catch (error) {
            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

            console.error(`Erro ao tentar encontrar um usuário: ${error}`)
            return res.status(500).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Cria um novo usuário
    async createUser(req: Request, res: Response): Promise<Response | void> {
        try {
            const { name, email, password } = req.body as CreateUserBody
            // Validação da senha
            const passwordValidation = passwordValidator(password)
            // Validação do email
            const emailValidation = emailValidator(email)

            const errors: string[] = []
            if (passwordValidation.errors)
                errors.push(...passwordValidation?.errors)
            if (emailValidation.errors)
                errors.push(...emailValidation?.errors)

            // Verificação se o usuário já existe
            const userExists = await userService.checkUserExists(email)
            if (userExists)
                errors.push('USER_EXISTS')

            // Ciptografa a senha
            const hashedPassword = await encryptData(password)

            // Caso tenha erros não prossegue com a criação do usuário
            if (errors.length > 0)
                return res.status(400).json({ feedback: new Feedback(false, errors) })

            // Cria o usuário no banco de dados
            const newUser = await userService.createUser({
                name, email, password: hashedPassword
            })

            // Envia um email para validar a conta
            userService.sendEmailToValidateAccount(newUser.id, newUser.email)
            // Gera um token para login simplificado
            const sectionToken = tokenHandler.generateToken({ email: newUser.email, password: newUser.password })
            return res.status(201).json({ feedback: new Feedback(true), token: sectionToken })
        } catch (error) {
            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

            console.error(`Erro ao tentar criar um usuário: ${error}`)
            return res.status(500).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Valida a conta do usuário por meio de um token enviado por email
    async validateUserAccount(req: Request, res: Response): Promise<Response | void> {
        const token = req.params.token
        // Verifiação de token para validar a conta
        tokenHandler.verifyToken(token, async (error, decoded: any) => {
            try {
                // Caso tenha erro o token é invalido
                if (error) return res.status(400).json
                    ({ feedback: new Feedback(false, ['INVALID_TOKEN']) })
                // Valida a conta
                await userService.updateUserData({ id: decoded.id }, { validatedAccount: true })
                return res.status(200).json({ feedback: new Feedback(true) })
            } catch (error) {
                if (error instanceof Error && error.message === 'USER_NOT_FOUND')
                    return res.status(404).json
                        ({ feedback: new Feedback(false, ['USER_NOT_FOUND']) })

                console.error(`Erro ao tentar validar conta de usuário: ${error}`)
                return res.status(500).json
                    ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
            }
        })
    }

    // Verifica se o login do usuário é valido
    async userLogin(req: Request, res: Response): Promise<Response | void> {
        try {
            // Obtem os dados pelo body e verifica se são validos
            const { email, password } = req.body as UserLoginBody
            const emailValidation = emailValidator(email)
            if (!emailValidation.success)
                return res.status(400).json({ feedback: emailValidation })
            const passwordValidation = passwordValidator(password)
            if (!passwordValidation.success)
                return res.status(400).json({ feedback: passwordValidation })
            // Busca o usuário para verificar se os dados estão certos para efetuar o login
            const { feedback, user } = await userService.userLogin(email, password)
            // Gera um token para login simplificado
            const sectionToken = tokenHandler.generateToken({ email: user.email, password: user.password })

            return res.status(200).json({ feedback, user, token: sectionToken })
        } catch (error) {
            if (error instanceof Error)
                return res.status(400).json({ feedback: new Feedback(false, [error.message]) })

            console.error(`Erro ao verificar o login de usuário: ${error}`)
            return res.status(500).json({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Validação de acesso por token
    async userLoginWithToken(req: Request, res: Response): Promise<Response | void> {
        try {
            // Obtem a authorization que acompanha o token
            const authorization = req.headers['authorization'] as string
            // Extrai o token da authorization
            const token = tokenHandler.extractAuthToken(authorization)
            // Verifica se token é valido
            tokenHandler.verifyToken(token, async (error, decoded: any) => {
                try {
                    // Caso tenha erro o token é invalido
                    if (error)
                        throw new Error('INVALID_TOKEN')
                    // Verifica se os dados do token corresponde ao do usuário
                    const { feedback, user } = await userService.userLogin(decoded.email, decoded.password, true)

                    return res.status(200).json({ feedback: feedback, user })
                } catch (error) {
                    if (error instanceof Error)
                        return res.status(400).json
                            ({ feedback: new Feedback(false, [error.message]) })

                    console.error(`Erro ao verificar o login de usuário com token: ${error}`)
                    return res.status(500).json
                        ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
                }
            })
        } catch (error) {
            if (error instanceof Error)
                return res.status(400).json({ feedback: new Feedback(false, [error.message]) })

            console.error(`Erro ao verificar o login de usuário com token: ${error}`)
            return res.status(500).json({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Envia link para alteração do password
    async sendEmailToUpdatePassword(req: Request, res: Response): Promise<Response | void> {
        try {
            const email = req.body.email as string
            // Verifica se o email é valido
            const emailFeedback = emailValidator(email)
            if (!emailFeedback.success)
                return res.status(400).json({ feedback: emailFeedback })
            // Verifica se o usuário existe
            await userService.getUser({ email })
            // Envia um email para o usuário poder trocar a senha
            const token = await userService.sendEmailToUpdatePassword(email)
            return res.status(200).json({ feedback: new Feedback(true), token })
        } catch (error) {
            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

            console.error(`Erro ao tentar envia email para troca de password: ${error}`)
            return res.status(500).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Muda a senha do usuário
    async updatePassword(req: Request, res: Response): Promise<Response | void> {
        try {
            // Obtem a authorization que acompanha o token
            const authorization = req.headers['authorization'] as string
            // Extrai o token da authorization
            const token = tokenHandler.extractAuthToken(authorization)
            // Verifica se token é valido
            tokenHandler.verifyToken(token, async (error, decoded: any) => {
                try {
                    // Caso tenha erro o token é invalido
                    if (error)
                        throw new Error('INVALID_TOKEN')
                    const user = await userService.getUser({ id: decoded.id }, { tokenToUpdatePassword: true })
                    // Verifica se o token é o mais atual
                    if (token !== user?.tokenToUpdatePassword)
                        throw new Error('INVALID_TOKEN')

                    const newPassword = req.body.password as string
                    // Verifica se o password é valido
                    const passwordFeedback = passwordValidator(newPassword)
                    if (!passwordFeedback.success)
                        return res.status(400).json({ feedback: passwordFeedback })
                    // Ciptografa a senha
                    const hashedPassword = await encryptData(newPassword)
                    // Atualiza a senha no banco de dados
                    await userService.updateUserData({ id: decoded.id, email: decoded.email }, { password: hashedPassword, tokenToUpdatePassword: '' })
    
                    return res.status(200).json({ feedback: new Feedback(true) })
                } catch (error) {
                    if (error instanceof Error)
                        return res.status(400).json
                            ({ feedback: new Feedback(false, [error.message]) })

                    console.error(`Erro ao trocar a senha do usuário: ${error}`)
                    return res.status(500).json
                        ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
                }
            })
        } catch (error) {
            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

            console.error(`Erro ao trocar a senha do usuário: ${error}`)
            return res.status(500).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Usado para direcionar o usuário para trocar sua senha em uma página web
    async sendPageToUpdatePassword(req: Request, res: Response) {
        const token = req.params.token as string
        res.render('update-password', { token, URL: process.env.URL, })
    }
}

export default new UserController()