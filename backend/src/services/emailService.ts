
import nodemailer from 'nodemailer';
import { pdfService } from './pdfService.js';

interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter;
    private fromEmail: string;

    constructor() {
        // If SMTP settings are provided, use them. Otherwise, log to console (dev mode).
        const smtpHost = process.env.SMTP_HOST;
        const smtpUser = process.env.SMTP_USER;

        console.log(`[EmailService] Initializing. SMTP_HOST present: ${!!smtpHost}, SMTP_USER present: ${!!smtpUser}`);

        if (smtpHost && smtpUser && process.env.SMTP_PASS) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: smtpUser,
                    pass: process.env.SMTP_PASS,
                },
            });
            this.fromEmail = process.env.SMTP_FROM || '"Yāl Office" <noreply@yaloffice.com>';
            console.log(`[EmailService] SMTP Transporter configured for host: ${smtpHost} port: ${process.env.SMTP_PORT} secure: ${process.env.SMTP_SECURE}`);
        } else {
            // Create a mock transporter for development if no creds
            this.transporter = {
                sendMail: async (mailOptions: any) => {
                    console.log('---------------------------------------------------');
                    console.log(`[EmailService] Mock Sending Email to ${mailOptions.to}`);
                    console.log(`[EmailService] Subject: ${mailOptions.subject}`);
                    console.log(`[EmailService] Body (preview): ${mailOptions.html?.substring(0, 100)}...`);
                    if (mailOptions.attachments) {
                        console.log(`[EmailService] Attachments: ${mailOptions.attachments.length}`);
                    }
                    console.log('---------------------------------------------------');
                    return { messageId: 'mock-id' };
                }
            } as any;
            this.fromEmail = '"Yāl Office (Dev)" <noreply@yaloffice.test>';
            console.warn('[EmailService] SMTP credentials not found (HOST/USER/PASS). Using Mock Transporter.');
        }
    }

    private async sendEmail(to: string, subject: string, html: string, attachments: EmailAttachment[] = []): Promise<boolean> {
        try {
            if (!to) return false;
            const info = await this.transporter.sendMail({
                from: this.fromEmail,
                to,
                subject,
                html,
                attachments,
            });
            console.log(`[EmailService] Email sent to ${to}. MessageId: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[EmailService] Error sending email:', error);
            return false;
        }
    }

    // 1. Signup Verification / Welcome
    async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
        const subject = 'Welcome to Yāl Office!';
        const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to Yāl Office, ${name}!</h2>
        <p>Thank you for signing up. We are excited to have you on board.</p>
        <p>If you haven't already, please verify your email address by clicking the link in the verification email sent by Supabase.</p>
        <br/>
        <p>Best regards,</p>
        <p>The Yāl Office Team</p>
      </div>
    `;
        return this.sendEmail(to, subject, html);
    }

    // 2. Forgot Password (Optional custom wrapper, usually handled by Supabase)
    async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
        const subject = 'Reset Your Password - Yāl Office';
        const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;
        return this.sendEmail(to, subject, html);
    }

    // 3. Successful Profile Uploaded
    async sendProfileUploadedEmail(to: string, name: string): Promise<boolean> {
        const subject = 'Profile Successfully Uploaded - Yāl Office';
        const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Profile Uploaded Successfully</h2>
        <p>Hi ${name},</p>
        <p>Your resume/profile has been successfully uploaded and parsed by our AI system.</p>
        <p>You can now proceed to take AI screening interviews or apply for jobs.</p>
        <br/>
        <p>Best regards,</p>
        <p>The Yāl Office Team</p>
      </div>
    `;
        return this.sendEmail(to, subject, html);
    }

    // 4. Interview Final Report
    // This constructs the email and uses pdfService to generate the attachment
    async sendInterviewReportEmail(
        to: string,
        name: string,
        jobTitle: string,
        analysis: { score: number; summary: string; strengths: string[]; improvements: string[] },
        transcript: string
    ): Promise<boolean> {
        try {
            // Generate PDF
            const pdfBuffer = await pdfService.generateInterviewReport(name, jobTitle, analysis, transcript);

            const subject = `Your Interview Report: ${jobTitle} - Yāl Office`;
            const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Interview Completed</h2>
          <p>Hi ${name},</p>
          <p>Thank you for completing the AI interview for the <strong>${jobTitle}</strong> position.</p>
          <p>Your session has been analyzed. Please find your detailed interview report attached.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 1.1em;"><strong>Overall Score: ${analysis.score}/10</strong></p>
            <p style="margin: 10px 0 0 0; color: #555;">${analysis.summary}</p>
          </div>

          <p>Best regards,</p>
          <p>The Yāl Office Team</p>
        </div>
      `;

            return this.sendEmail(to, subject, html, [
                {
                    filename: `Interview_Report_${name.replace(/\s+/g, '_')}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]);
        } catch (error) {
            console.error('[EmailService] Failed to generate valid report PDF or send email:', error);
            // Fallback: send without attachment or just error
            return false;
        }
    }
}

export const emailService = new EmailService();
