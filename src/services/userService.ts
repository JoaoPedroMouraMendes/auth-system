import prismaClient from "../prisma"
import { Prisma, User } from "@prisma/client"
import Feedback from "../utils/feedback"
import bcrypt from "bcrypt"
import tokenHandler from "../security/tokenHandler"
import EmailController from "../email/emailController"

interface UserLoginReturn {
    feedback: Feedback,
    user: Partial<User>
}

type FindUserProps = Partial<Pick<User, 'id' | 'email'>>

class UserService {
    // Obtem um usuário
    async getUser(where: FindUserProps, select?: Prisma.UserSelect): Promise<User | null> {
        try {
            return await prismaClient.user.findFirst({
                where: where,
                select: select
            })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2023')
                throw new Error('USER_NOT_FOUND')

            throw new Error('DATABASE_ERROR')
        }
    }

    // Verifica se o usuário já existe no banco de dados
    async checkUserExists(email: string) {
        try {
            const user = await this.getUser({ email }, { id: true })
            return user != null
        } catch (error) {
            throw new Error('DATABASE_ERROR')
        }
    }

    // Cria o usuário no banco de dados
    async createUser(data: Pick<User, 'password' | 'name' | 'email'>) {
        try {
            const newUser = await prismaClient.user.create({ data })
            return newUser
        } catch (error) {
            throw new Error('DATABASE_ERROR')
        }
    }

    // Atualiza os dados do usuário
    async updateUserData(where: Prisma.UserWhereUniqueInput, dataToUpdate: Partial<User>): Promise<User> {
        try {
            const updatedUser = await prismaClient.user.update({
                where: where,
                data: dataToUpdate
            })
            return updatedUser
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2023')
                throw new Error('USER_NOT_FOUND')
            else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
                throw new Error('INVALID_EMAIL')

            throw new Error('DATABASE_ERROR')
        }
    }

    // Verifica se o login do usuário é valido
    async userLogin(email: string, password: string, loginWithToken: boolean = false): Promise<UserLoginReturn> {
        try {
            const user = await this.getUser({ email })

            if (!user) throw new Error('USER_NOT_FOUND')

            if (loginWithToken) {
                if (password !== user.password) {
                    throw new Error('INVALID_PASSWORD')
                }
            }
            else {
                const validPassword = await bcrypt.compare(password, user.password)
                if (!validPassword) throw new Error('INVALID_PASSWORD')
            }

            if (!user.validatedAccount) {
                this.sendEmailToValidateAccount(user.id, user.email);
                throw new Error('ACCOUNT_NOT_VALIDATED')
            }

            const { password: p, ...safeUser } = user
            return { feedback: new Feedback(true), user: safeUser }
        } catch (error) {
            if (error instanceof Error)
                throw new Error(error.message)
            throw new Error('DATABASE_ERROR')
        }
    }

    // Envia um email para validar a conta do usuário
    async sendEmailToValidateAccount(userId: string, addressee: string) {
        const emailToken = tokenHandler.generateToken({ id: userId }, { expiresIn: '1h' })
        const link = `${process.env.URL}/user/validation/${emailToken}`
        const emailController = new EmailController()
        emailController.transporter.sendMail({
            from: `Auth System<${emailController.mailAddress}>`,
            to: addressee,
            subject: 'Confirme sua conta',
            html: `<p>Olá</p>
                <p>Para validar sua conta clique <a href='${link}'>aqui</a></p>
                <p><strong>
                    Caso não seja você quem criou a conta, apenas ignore essa mensagem
                </strong></p>`
        })
    }

    async sendEmailToUpdatePassword(userEmail: string) {
        const user = await this.getUser({ email: userEmail }, { id: true, validatedAccount: true }) as Pick<User, 'id' | 'validatedAccount'>
        if (!user.validatedAccount) throw new Error('ACCOUNT_NOT_VALIDATED')
        const emailToken = tokenHandler.generateToken({ id: user.id, email: userEmail }, { expiresIn: '1h' })
        const link = `${process.env.URL}/user/pages/update-password/${emailToken}`
        const emailController = new EmailController()
        emailController.transporter.sendMail({
            from: `Auth System<${emailController.mailAddress}>`,
            to: userEmail,
            subject: 'Mudança de senha',
            html: `<p>Olá</p>
                <p>Para trocar sua senha clique <a href='${link}'>aqui</a></p>
                <p><strong>
                    Caso não seja você quem solicitou a mudança de senha, apenas ignore essa mensagem
                </strong></p>`
        })
    }
}

export default new UserService()