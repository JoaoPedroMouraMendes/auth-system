import Feedback from "../utils/feedback"

// Verifica se a senha segue os padrões
export default function passwordValidator(password: string): Feedback {
    const minChars = 8
    const maxChars = 40
    const errors: string[] = []

    if (!password)
        return new Feedback(false, ['UNDEFINED_PASSWORD'])
    if (typeof password !== 'string')
        return new Feedback(false, ['INVALID_PASSWORD_TYPE'])
    if (password.length < minChars)
        errors.push('PASSWORD_TOO_SHORT')
    if (password.length > maxChars)
        errors.push('PASSWORD_TOO_LONG')
    if (!/[A-Z]/.test(password))
        errors.push('PASSWORD_NO_UPPERCASE')
    if (!/[a-z]/.test(password))
        errors.push('PASSWORD_NO_LOWERCASE')
    if (!/[0-9]/.test(password))
        errors.push('PASSWORD_NO_NUMBER')
    if (!/[!@#$%^&*()_+\-=\[\]{};':\\|,.<>\/?]/g.test(password))
        errors.push('PASSWORD_NO_SPECIAL_CHAR')

    if (errors.length > 0)
        return new Feedback(false, errors)
    return new Feedback(true)
}

function countUniqueLetters(password: string) {
    const uniqueLetters = new Set();
    for (const char of password)
        if (/[a-zA-Z]/.test(char))
            uniqueLetters.add(char.toLowerCase())
    
    return uniqueLetters.size
}