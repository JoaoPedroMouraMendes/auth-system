import { Request, Response } from "express"
import userService from "../services/userService"
import passwordValidator from "../validators/passwordValidator"
import Feedback from "../utils/feedback"
import emailValidator from "../validators/emailValidator"
import EmailController from "../email/emailController"
import encryptData from "../security/encryptData"
import dotenv from "dotenv"
import tokenHandler from "../security/tokenHandler"
import * as jwt from "jsonwebtoken"

dotenv.config()

interface CreateUserProps {
    name: string
    email: string
    password: string
}

interface UserLoginProps {
    email: string
    password: string
}

class UserController {
    // Retorna o usuário
    async getUser(req: Request, res: Response): Promise<Response | void> {
        try {
            const userId = req.params.id
            const user = await userService.getUser({ id: userId })

            if (!user)
                return res.status(404).json({ feedback: new Feedback(false, ['USER_NOT_FOUND']) })

            return res.status(200).json({ feedback: new Feedback(true), user })
        } catch (error) {
            console.error(`Erro ao tentar encontrar um usuário: ${error}`)

            if (error instanceof Error)
                return res.status(400).json
                    ({ feedback: new Feedback(false, [error.message]) })

            return res.status(400).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Cria um novo usuário
    async createUser(req: Request, res: Response): Promise<Response | void> {
        try {
            const { name, email, password } = req.body as CreateUserProps
            // Validação da senha
            const passwordValidation = passwordValidator(password)
            // Validação do email
            const emailValidation = emailValidator(email)

            const errors: string[] = []
            if (passwordValidation.errors)
                errors.push(...passwordValidation?.errors)
            if (emailValidation.errors)
                errors.push(...emailValidation?.errors)

            // Ciptografa a senha
            const hashedPassword = await encryptData(password)
            // Verificação se o usuário já existe
            const userExists = await userService.checkUserExists(email)
            if (userExists)
                errors.push('USER_EXISTS')

            // Caso tenha erros não prossegue com a criação do usuário
            if (errors.length > 0)
                return res.status(400).json({ feedback: new Feedback(false, errors) })

            // Cria o usuário no banco de dados
            const newUser = await userService.createUser({
                name, email, password: hashedPassword
            })

            // Envia um email para validar a conta
            const token = tokenHandler.generateToken({ id: newUser.id }, { expiresIn: '1h' })
            const link = `${process.env.URL}/user/validation/${token}`
            const emailController = new EmailController()
            emailController.transporter.sendMail({
                from: `Auth System<${emailController.mailAddress}>`,
                to: email,
                subject: 'Confirme sua conta',
                html: `<p>Olá</p>
                <p>Para validar sua conta clique <a href='${link}'>aqui</a></p>
                <p><strong>
                    Caso não seja você quem criou a conta, ignore essa mensagem
                </strong></p>`
            })

            return res.status(201).json({ feedback: new Feedback(true) })
        } catch (error) {
            console.error(`Erro ao tentar criar um usuário: ${error}`)

            return res.status(400).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    // Valida a conta do usuário por meio de um token
    async validateUserAccount(req: Request, res: Response): Promise<Response | void> {
        const token = req.params.token
        const SECRET = process.env.SECRET as string
        jwt.verify(token, SECRET, async (error, decoded: any) => {
            try {
                if (error) return res.status(400).json
                    ({ feedback: new Feedback(false, ['INVALID_TOKEN']) })

                await userService.updateUserData(decoded.id, { validatedAccount: true })
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
            const { email, password } = req.body as UserLoginProps
            if (!email)
                throw new Error('EMAIL_IS_REQUIRED')
            if (typeof email !== 'string')
                throw new Error('INVALID_EMAIL_TYPE')
            if (!password)
                throw new Error('PASSWORD_IS_REQUIRED')
            if (typeof password !== 'string')
                throw new Error('INVALID_PASSWORD_TYPE')

            const { feedback, user } = await userService.userLogin(email, password)

            return res.status(200).json({ feedback, user })
        } catch (error) {
            console.log(`Erro ao verificar o login de usuário: ${error}`)

            if (error instanceof Error)
                return res.status(400).json({ feedback: new Feedback(false, [error.message]) })

            return res.status(400).json({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }
}

export default new UserController()