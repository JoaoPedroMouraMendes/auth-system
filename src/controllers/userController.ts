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

class UserController {
    // Retorna o usuário
    async getUser(req: Request, res: Response): Promise<Response | void> {
        try {
            const userId = req.params.id
            const user = await userService.getUser({ id: userId})

            if (!user)
                return res.status(404).json({ feedback: new Feedback(false, ['USER_NOT_FOUND']) })

            return res.status(200).json({ feedback: new Feedback(true), user })
        } catch (error) {
            console.error(`Erro ao tentar encontrar um usuário: ${error}`)

            if (error instanceof Error && error.message === 'DATABASE_ERROR')
                return res.status(400).json
                    ({ feedback: new Feedback(false, ['DATABASE_ERROR']) })

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

            // Envia um email notificando a criação da conta
            const token = tokenHandler.generateToken({ id: newUser.id }, { expiresIn: '1h' })
            const link = `${process.env.URL}/user/validation/${token}`
            await new EmailController().transporter.sendMail({
                to: email,
                subject: 'Confirme sua conta',
                html: `<p>Olá</p>
                <p>Para validar sua conta acesse o link: ${link}</p>'
                <p><strong>
                    Caso você não seja você que criou a conta apenas não acesse o link
                </strong></p>`
            })

            return res.status(201).json({ feedback: new Feedback(true) })
        } catch (error) {
            console.error(`Erro ao tentar criar um usuário: ${error}`)

            return res.status(400).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }

    async validateUserAccount(req: Request, res: Response): Promise<Response | void> {
        try {
            const token = req.params.token
            const SECRET = process.env.SECRET as string
            jwt.verify(token, SECRET, (error, decoded: any) => {
                if (error) return res.status(400).json
                    ({ feedback: new Feedback(false, ['INVALID_TOKEN'])})

                userService.updateUserData(decoded.id, { validatedAccount: true })
                return res.status(200).json({ feedback: new Feedback(true)})
            })
        } catch (error) {
            console.error(`Erro ao tentar validar conta de usuário: ${error}`)

            return res.status(400).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }
}

export default new UserController()