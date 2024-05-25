import prismaClient from "../prisma"
import { User } from "@prisma/client"

type SafeUserProps = Omit<User, 'password'>

class UserService {
    // Obtem um usuário
    async getUser(userId: string): Promise<SafeUserProps | null> {
        try {
            return await prismaClient.user.findFirst({
                where: {
                    id: userId
                },
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
}

export default new UserService()