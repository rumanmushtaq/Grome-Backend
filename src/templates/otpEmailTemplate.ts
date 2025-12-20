

export function OtpEmailTemplate(name: string, otp: number) {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f7fa;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      padding: 30px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .header {
      font-size: 24px;
      font-weight: 600;
      color: #4CAF50;
      margin-bottom: 20px;
    }
    .otp {
      font-size: 36px;
      font-weight: bold;
      color: #007bff;
      background-color: #f0f8ff;
      padding: 15px;
      border-radius: 8px;
      display: inline-block;
      margin: 20px 0;
    }
    .message {
      font-size: 16px;
      color: #555555;
      margin: 20px 0;
      text-align: left;
    }
    .footer {
      font-size: 14px;
      color: #888888;
      margin-top: 30px;
      text-align: center;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">Your OTP Code</div>
    <p class="message">Dear ${name},</p>
    <p class="message">We received a request to verify your email address. To complete the verification process, please use the One-Time Password (OTP) below:</p>
    <div class="otp">${otp}</div>
    <p class="message">If you did not request this, you can safely ignore this email.</p>
    <div class="footer">
      <p>Thank you for using our service!<br>The Team</p>
      <p><a href="#">Need help?</a></p>
    </div>
  </div>
</body>
</html>

      `;
}

export function SendBlogOnMail(blog: any) {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title> ${blog?.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
        }
        .header h1 {
            font-size: 24px;
            margin: 0;
        }
        .content {
            font-size: 16px;
            line-height: 1.6;
        }
        .content img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            font-size: 14px;
            color: #888;
        }
        .footer a {
            color: #007BFF;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${blog?.title}</h1>
        </div>
        <div class="content">
            <!-- Render dynamic HTML content -->
          ${blog?.description}

            <!-- Optionally add the image if it exists -->
        
      
      <div>
      
     <a href="${blog.image.url}" target="_blank" rel="noopener noreferrer">Visit Image!</a>

  
</div>

        </div>
        <div class="footer">
            <p>Thank you for subscribing to our blog!</p>
        </div>
    </div>
</body>
</html>

  `;
}


export function ContactUsTemplate(name: string, email: string, message: string) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Us Inquiry</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              color: #333;
              margin: 0;
              padding: 0;
          }
          .container {
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              background-color: #fff;
              padding: 20px;
              border-radius: 5px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .header {
              text-align: center;
              padding-bottom: 20px;
          }
          .header h1 {
              font-size: 24px;
              margin: 0;
          }
          .content {
              font-size: 16px;
              line-height: 1.6;
          }
          .footer {
              text-align: center;
              padding-top: 20px;
              font-size: 14px;
              color: #888;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>New Contact Us Inquiry</h1>
          </div>
          <div class="content">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
          </div>
          <div class="footer">
              <p>This email was sent via the Contact Us form.</p>
          </div>
      </div>
  </body>
  </html>
  `;
}