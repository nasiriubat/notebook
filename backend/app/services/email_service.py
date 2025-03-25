import smtplib
from email.mime.text import MIMEText
from flask import current_app


class EmailService:
    def __init__(self):
        self.smtp_server = current_app.config['SMTP_SERVER']
        self.smtp_port = current_app.config['SMTP_PORT']
        self.sender_email = current_app.config['SMTP_EMAIL']
        self.sender_password = current_app.config['SMTP_PASSWORD']

    def send_email(self, recipient_email, subject, body):
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = self.sender_email
        msg['To'] = recipient_email

        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.sendmail(self.sender_email, [recipient_email], msg.as_string())