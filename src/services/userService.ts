import prismaClient from "../prisma"
import { Prisma, User } from "@prisma/client"
import Feedback from "../utils/feedback"

type SafeUserProps = Omit<User, 'password' | 'validatedAccount'>

class UserService {
    // Obtem um usuário
    async getUser(where: Partial<User>): Promise<SafeUserProps | null> {
        try {
            return await prismaClient.user.findFirst({
                where: where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    created_at: true
                }
            })
        } catch (error) {
            throw new Error('DATABASE_ERROR')
        }
    }

    // Verifica se o usuário já existe no banco de dados
    async checkUserExists(email: string) {
        try {
            const user = await this.getUser({ email })
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
    async userLogin(email: string, password: string): Promise<Feedback> {
        const user = await prismaClient.user.findFirst({ where: { email } })

        if (!user) return new Feedback(false, ['USER_NOT_FOUND'])

        if (user.password != password) return new Feedback(false, ['INVALID_PASSWORD'])

        if (!user.validatedAccount) return new Feedback(false, ['ACCOUNT_NOT_VALIDATED'])

        return new Feedback(true)
    }
}

export default new UserService()