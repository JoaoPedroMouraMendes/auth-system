import nodemailer, { Transporter } from "nodemailer"
import { MailOptions } from "nodemailer/lib/json-transport"
import SMTPTransport from "nodemailer/lib/smtp-transport"
import dotenv from "dotenv"

dotenv.config()

export default class MailController {
    transporter: Transporter<SMTPTransport.SentMessageInfo>
    mailAddress: string = ''

    constructor(transport?: string | SMTPTransport | SMTPTransport.Options) {
        // Caso o transport esteja declara o valor padrão nele
        if (transport === undefined) transport = this.getDefaultTransport()

        if (typeof transport === 'object' && transport.auth?.user) 
            this.mailAddress = transport.auth.user

        this.transporter = nodemailer.createTransport(transport)
    }

    getDefaultTransport(): SMTPTransport.Options {
        return {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_ADDRESS,
                pass: process.env.EMAIL_PASSWORD
            }
        }
    }

    setMailOptions(mailOptions: Omit<MailOptions, 'from'>, mailName: string = ''): MailOptions {
        return {
            from: `${mailName} <${this.mailAddress}>`,
            ...mailOptions
        }
    }

    async sendMail(mailOptions: Omit<MailOptions, 'from'>, mailName?: string) {
        await this.transporter.sendMail(this.setMailOptions(mailOptions, mailName))
    }
}