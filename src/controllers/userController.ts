import { Request, Response } from "express"
import userService from "../services/userService"
import passwordValidator from "../validators/passwordValidator"
import Feedback from "../utils/feedback"
import emailValidator from "../validators/emailValidator"
import MailController from "../email/mailController"

interface CreateUserProps {
    name: string
    email: string
    password: string
}

export default class UserController {
    // Retorna o usuário
    async getUser(req: Request, res: Response): Promise<Response | void> {
        try {
            const user = await userService.getUser(req.params.id)

            if (!user)
                return res.status(404).json({ feedback: new Feedback(false, ['USER_NOT_FOUND']) })

            return res.status(200).json({ feedback: new Feedback(true), user })
        } catch (error) {
            console.error(`Erro ao tentar encontrar um usuário: ${error}`)

            if (error instanceof Error && error.message === 'DATABASE_ERROR')
                return res.status(404).json({ feedback: new Feedback(false, ['DATABASE_ERROR']) })

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

            if (errors.length > 0)
                return res.status(400).json({ feedback: new Feedback(false, errors) })
            return res.status(201).json({ feedback: new Feedback(true) })
        } catch (error) {
            console.error(`Erro ao tentar criar um usuário: ${error}`)

            return res.status(400).json
                ({ feedback: new Feedback(false, ['INTERNAL_SERVER_ERROR']) })
        }
    }
}