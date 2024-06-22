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
            const user = await userService.getUser({ id: userId })

            return res.status(200).json({ feedback: new Feedback(true), user })
        } catch (error) {
            console.error(`Erro ao tentar encontrar um usuário: ${error}`)

            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

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

            const sectionToken = tokenHandler.generateToken({ email: newUser.email, password: newUser.password })
            return res.status(201).json({ feedback: new Feedback(true), token: sectionToken })
        } catch (error) {
            console.error(`Erro ao tentar criar um usuário: ${error}`)

            return res.status(500).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Valida a conta do usuário por meio de um token
    async validateUserAccount(req: Request, res: Response): Promise<Response | void> {
        const token = req.params.token
        tokenHandler.verifyToken(token, async (error, decoded: any) => {
            try {
                if (error) return res.status(400).json
                    ({ feedback: new Feedback(false, ['INVALID_TOKEN']) })

                await userService.updateUserData({ id: decoded.id }, { validatedAccount: true })
                return res.status(200).json({ feedback: new Feedback(true) })
            } catch (error) {
                console.error(`Erro ao tentar validar conta de usuário: ${error}`)

                if (error instanceof Error && error.message === 'USER_NOT_FOUND')
                    return res.status(404).json
                        ({ feedback: new Feedback(false, ['USER_NOT_FOUND']) })

                return res.status(400).json
                    ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
            }
        })
    }

    // Verifica se o login do usuário é valido
    async userLogin(req: Request, res: Response): Promise<Response | void> {
        try {
            const { email, password } = req.body as UserLoginBody
            if (!email)
                throw new Error('EMAIL_IS_REQUIRED')
            if (typeof email !== 'string')
                throw new Error('INVALID_EMAIL_TYPE')
            if (!password)
                throw new Error('PASSWORD_IS_REQUIRED')
            if (typeof password !== 'string')
                throw new Error('INVALID_PASSWORD_TYPE')

            const { feedback, user } = await userService.userLogin(email, password)
            const sectionToken = tokenHandler.generateToken({ email: user.email, password: user.password })

            return res.status(200).json({ feedback, user, token: sectionToken })
        } catch (error) {
            console.log(`Erro ao verificar o login de usuário: ${error}`)

            if (error instanceof Error)
                return res.status(400).json({ feedback: new Feedback(false, [error.message]) })

            return res.status(500).json({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Validação de acesso por token
    async userLoginWithToken(req: Request, res: Response): Promise<Response | void> {
        try {
            const authorization = req.headers['authorization'] as string
            const token = tokenHandler.extractAuthToken(authorization)
            tokenHandler.verifyToken(token, async (error, decoded: any) => {
                try {
                    if (error)
                        throw new Error('INVALID_TOKEN')

                    const { feedback, user } = await userService.userLogin(decoded.email, decoded.password, true)

                    return res.status(200).json({ feedback: feedback, user })
                } catch (error) {
                    console.log(`Erro ao verificar o login de usuário com token: ${error}`)

                    if (error instanceof Error)
                        return res.status(400).json
                            ({ feedback: new Feedback(false, [error.message]) })

                    return res.status(400).json
                        ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
                }
            })
        } catch (error) {
            console.log(`Erro ao verificar o login de usuário com token: ${error}`)

            if (error instanceof Error)
                return res.status(400).json({ feedback: new Feedback(false, [error.message]) })

            return res.status(500).json({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Envia link para alteração do password
    async sendEmailToUpdatePassword(req: Request, res: Response): Promise<Response | void> {
        try {
            const email = req.body.email as string
            const emailFeedback = emailValidator(email)
            if (!emailFeedback.success)
                return res.status(400).json({ feedback: emailFeedback })
            await userService.getUser({ email })
            const token = await userService.sendEmailToUpdatePassword(email)
            return res.status(200).json({ feedback: new Feedback(true), token })
        } catch (error) {
            console.log(`Erro ao tentar envia email para troca de password: ${error}`)

            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

            return res.status(400).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Muda a senha do usuário
    async updatePassword(req: Request, res: Response): Promise<Response | void> {
        try {
            const authorization = req.headers['authorization'] as string
            const token = tokenHandler.extractAuthToken(authorization)
            tokenHandler.verifyToken(token, async (error, decoded: any) => {
                try {
                    if (error)
                        throw new Error('INVALID_TOKEN')

                    const newPassword = req.body.password as string
                    const passwordFeedback = passwordValidator(newPassword)
                    if (!passwordFeedback.success)
                        return res.status(400).json({ feedback: passwordFeedback })
                    // Ciptografa a senha
                    const hashedPassword = await encryptData(newPassword)

                    const user = await userService.getUser({ id: decoded.id }, { tokenToUpdatePassword: true })
                    // Verifica se o token é o mais atual
                    if (token !== user?.tokenToUpdatePassword)
                        throw new Error('INVALID_TOKEN')

                    await userService.updateUserData({ id: decoded.id, email: decoded.email }, { password: hashedPassword })
                    return res.status(200).json({ feedback: new Feedback(true) })
                } catch (error) {
                    console.log(`Erro ao trocar a senha do usuário: ${error}`)

                    if (error instanceof Error)
                        return res.status(400).json
                            ({ feedback: new Feedback(false, [error.message]) })

                    return res.status(400).json
                        ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
                }
            })
        } catch (error) {
            console.log(`Erro ao trocar a senha do usuário: ${error}`)

            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

            return res.status(400).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    async sendPageToUpdatePassword(req: Request, res: Response) {
        const token = req.params.token as string
        res.render('update-password', { token, URL: process.env.URL })
    }
}

export default new UserController()