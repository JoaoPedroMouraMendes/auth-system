import Feedback from "../utils/feedback"

export default function emailValidator(email: string): Feedback {
    if (!email) return new Feedback(false, ['UNDEFINED_EMAIL'])

    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regex.test(email))
        return new Feedback(false, ['INVALID_EMAIL'])
    return new Feedback(true)
}