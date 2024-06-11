import prismaClient from "../prisma"
import { Prisma, User } from "@prisma/client"
import Feedback from "../utils/feedback"
import bcrypt from "bcrypt"

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
    async createUser(data: Omit<User, 'id' | 'created_at' | 'validatedAccount'>) {
        try {
            const newUser = await prismaClient.user.create({ data })
            return newUser
        } catch (error) {
            throw new Error('DATABASE_ERROR')
        }
    }

    // Atualiza os dados do usuário
    async updateUserData(userId: string, dataToUpdate: Partial<User>): Promise<User> {
        try {
            const updatedUser = await prismaClient.user.update({
                where: { id: userId },
                data: dataToUpdate
            })
            return updatedUser
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2023')
                throw new Error('USER_NOT_FOUND')

            throw new Error('DATABASE_ERROR')
        }
    }

    // Verifica se o login do usuário é valido
    async userLogin(email: string, password: string): Promise<UserLoginReturn> {
        try {
            const user = await this.getUser({ email })

            if (!user) throw new Error('USER_NOT_FOUND')

            const validPassword = await bcrypt.compare(password, user.password)
            if (!validPassword) throw new Error('INVALID_PASSWORD')

            if (!user.validatedAccount) throw new Error('ACCOUNT_NOT_VALIDATED')

            const { password: p, ...safeUser } = user
            return { feedback: new Feedback(true), user: safeUser }
        } catch (error) {
            if (error instanceof Error)
                throw new Error(error.message)
            throw new Error('DATABASE_ERROR')
        }
    }
}

export default new UserService()