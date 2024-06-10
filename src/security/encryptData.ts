import bcrypt from "bcrypt"

export default async function encryptData(data: string) {
    const saltRounds = 10
    const hashedData = await bcrypt.hash(data, saltRounds)
    return hashedData
}