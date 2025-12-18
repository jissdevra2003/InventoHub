import { mailTransporter } from "./mail";



interface SendEmailOptions
{
     to: string;
  subject: string;
  html: string;
}

export const sendEmail=async ({to,subject,html}:SendEmailOptions)=>{

    await mailTransporter.sendMail({

        from:`"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIl}>`,
        to,
        subject,
        html
    });
}