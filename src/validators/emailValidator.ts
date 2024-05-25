import Feedback from "../utils/feedback"

export default function emailValidator(email: string): Feedback {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regex.test(email))
        return new Feedback(false, ['EMAIL_INVALID'])
    return new Feedback(true)
}