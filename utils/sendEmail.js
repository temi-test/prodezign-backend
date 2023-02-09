const nodemailer = require("nodemailer");

let sendVerificationEmail = async (email, subject, text) => {
 
    try {

        const transporter = nodemailer.createTransport({
            host: process.env.HOST,
            service: process.env.SERVICE,
            port: Number(process.env.EMAIL_PORT),
            secure: Boolean(process.env.SECURE),
            auth: {
                user: process.env.USER,
                pass:process.env.PASS
            }
        });

        const result = await transporter.sendMail({
            from: process.env.USER,
            to: email,
            subject: subject,
            text: text

        });
        console.log("verification email sent successfully");
        console.log(result);

        return true;
        
    } catch (error) {
        console.log("verification email not sent. There was an error");
        console.log(error);

        return false;
        // return res.status(500).send({
        //     message: "There was an error signing up. Try again"
        //   });
      
    }
}

module.exports = sendVerificationEmail;