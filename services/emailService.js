/**
 * Email Service
 * Handles email sending operations
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/Logger');
const { ValidationError } = require('../utils/ErrorHandler');

class EmailService {
  
  static transporter = null;

  /**
   * Initialize email transporter
   */
  static initializeTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      });
    }
    return this.transporter;
  }

  /**
   * Send verification email
   */
  static async sendVerificationEmail(email, verificationCode, userName) {
    const startTime = Date.now();
    
    try {
      const transporter = this.initializeTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@decoremore.com',
        to: email,
        subject: 'تأكيد البريد الإلكتروني - Decore & More',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">Decore & More</h1>
                <p style="color: #7f8c8d; margin: 5px 0;">منصة التصميم الداخلي</p>
              </div>
              
              <h2 style="color: #34495e; text-align: center;">مرحباً ${userName}</h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                شكراً لتسجيلك في منصة Decore & More. لإكمال عملية التسجيل، يرجى استخدام رمز التحقق التالي:
              </p>
              
              <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h1 style="color: #2c3e50; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
              </div>
              
              <p style="color: #555; font-size: 14px; line-height: 1.6;">
                هذا الرمز صالح لمدة 10 دقائق فقط. إذا لم تقم بطلب هذا التحقق، يرجى تجاهل هذا البريد الإلكتروني.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #7f8c8d; font-size: 12px;">
                  © 2024 Decore & More. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      logger.info('Verification email sent successfully', {
        email,
        userName,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send verification email', {
        email,
        userName,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email, resetCode, userName) {
    const startTime = Date.now();
    
    try {
      const transporter = this.initializeTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@decoremore.com',
        to: email,
        subject: 'إعادة تعيين كلمة المرور - Decore & More',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">Decore & More</h1>
                <p style="color: #7f8c8d; margin: 5px 0;">منصة التصميم الداخلي</p>
              </div>
              
              <h2 style="color: #34495e; text-align: center;">مرحباً ${userName}</h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الرمز التالي لإعادة تعيين كلمة المرور:
              </p>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #ffeaa7;">
                <h1 style="color: #d63031; font-size: 32px; margin: 0; letter-spacing: 5px;">${resetCode}</h1>
              </div>
              
              <p style="color: #555; font-size: 14px; line-height: 1.6;">
                هذا الرمز صالح لمدة 15 دقيقة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.
              </p>
              
              <div style="background-color: #fee; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #d63031; font-size: 14px; margin: 0;">
                  <strong>تحذير:</strong> لا تشارك هذا الرمز مع أي شخص آخر لحماية حسابك.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #7f8c8d; font-size: 12px;">
                  © 2024 Decore & More. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      logger.info('Password reset email sent successfully', {
        email,
        userName,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send password reset email', {
        email,
        userName,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Send engineer approval email
   */
  static async sendEngineerApprovalEmail(email, engineerData) {
    const startTime = Date.now();
    
    try {
      const transporter = this.initializeTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@decoremore.com',
        to: email,
        subject: 'تم قبول طلبك - Decore & More',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">Decore & More</h1>
                <p style="color: #7f8c8d; margin: 5px 0;">منصة التصميم الداخلي</p>
              </div>
              
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 8px; border: 1px solid #c3e6cb;">
                  <h2 style="margin: 0;">🎉 مبروك! تم قبول طلبك</h2>
                </div>
              </div>
              
              <h2 style="color: #34495e;">مرحباً ${engineerData.firstName} ${engineerData.lastName}</h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                نحن سعداء لإعلامك بأنه تم قبول طلب انضمامك كمهندس ديكور في منصة Decore & More!
              </p>
              
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">الخطوات التالية:</h3>
                <ul style="color: #555; line-height: 1.8;">
                  <li>يمكنك الآن تسجيل الدخول إلى حسابك</li>
                  <li>إنشاء مشاريعك وباقاتك</li>
                  <li>البدء في استقبال طلبات العملاء</li>
                  <li>بناء ملفك الشخصي المهني</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                   style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  تسجيل الدخول الآن
                </a>
              </div>
              
              <p style="color: #555; font-size: 14px; line-height: 1.6;">
                نتطلع للعمل معك وتقديم أفضل الخدمات لعملائنا. إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #7f8c8d; font-size: 12px;">
                  © 2024 Decore & More. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      logger.info('Engineer approval email sent successfully', {
        email,
        engineerName: `${engineerData.firstName} ${engineerData.lastName}`,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send engineer approval email', {
        email,
        engineerName: `${engineerData.firstName} ${engineerData.lastName}`,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Send engineer rejection email
   */
  static async sendEngineerRejectionEmail(email, engineerData) {
    const startTime = Date.now();
    
    try {
      const transporter = this.initializeTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@decoremore.com',
        to: email,
        subject: 'تحديث حول طلب الانضمام - Decore & More',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">Decore & More</h1>
                <p style="color: #7f8c8d; margin: 5px 0;">منصة التصميم الداخلي</p>
              </div>
              
              <h2 style="color: #34495e;">مرحباً ${engineerData.firstName} ${engineerData.lastName}</h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                شكراً لاهتمامك بالانضمام إلى منصة Decore & More كمهندس ديكور.
              </p>
              
              <div style="background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
                <p style="margin: 0; font-size: 16px;">
                  للأسف، لم نتمكن من قبول طلبك في الوقت الحالي.
                </p>
                <p style="margin: 10px 0 0 0; font-size: 14px;">
                  <strong>السبب:</strong> ${engineerData.reason}
                </p>
              </div>
              
              <p style="color: #555; font-size: 14px; line-height: 1.6;">
                نقدر اهتمامك ونشجعك على التقديم مرة أخرى في المستقبل بعد تحسين المتطلبات المطلوبة.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #7f8c8d; font-size: 12px;">
                  © 2024 Decore & More. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      logger.info('Engineer rejection email sent successfully', {
        email,
        engineerName: `${engineerData.firstName} ${engineerData.lastName}`,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send engineer rejection email', {
        email,
        engineerName: `${engineerData.firstName} ${engineerData.lastName}`,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Send booking confirmation email
   */
  static async sendBookingConfirmationEmail(email, bookingData) {
    const startTime = Date.now();
    
    try {
      const transporter = this.initializeTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@decoremore.com',
        to: email,
        subject: 'تأكيد الحجز - Decore & More',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">Decore & More</h1>
                <p style="color: #7f8c8d; margin: 5px 0;">منصة التصميم الداخلي</p>
              </div>
              
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 8px; border: 1px solid #c3e6cb;">
                  <h2 style="margin: 0;">✅ تم تأكيد حجزك بنجاح</h2>
                </div>
              </div>
              
              <h2 style="color: #34495e;">مرحباً ${bookingData.clientName}</h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                تم تأكيد حجزك بنجاح. إليك تفاصيل الحجز:
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">تفاصيل الحجز:</h3>
                <p style="margin: 5px 0;"><strong>رقم الحجز:</strong> ${bookingData.bookingId}</p>
                <p style="margin: 5px 0;"><strong>المهندس:</strong> ${bookingData.engineerName}</p>
                <p style="margin: 5px 0;"><strong>الخدمة:</strong> ${bookingData.serviceName}</p>
                <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${bookingData.date}</p>
                <p style="margin: 5px 0;"><strong>المبلغ:</strong> ${bookingData.amount} ريال</p>
              </div>
              
              <p style="color: #555; font-size: 14px; line-height: 1.6;">
                سيتواصل معك المهندس قريباً لتنسيق تفاصيل الخدمة. يمكنك متابعة حالة طلبك من خلال حسابك على المنصة.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #7f8c8d; font-size: 12px;">
                  © 2024 Decore & More. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      logger.info('Booking confirmation email sent successfully', {
        email,
        bookingId: bookingData.bookingId,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send booking confirmation email', {
        email,
        bookingId: bookingData.bookingId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  static async testEmailConfiguration() {
    try {
      const transporter = this.initializeTransporter();
      await transporter.verify();
      logger.info('Email configuration is valid');
      return true;
    } catch (error) {
      logger.error('Email configuration test failed', {
        error: error.message
      });
      return false;
    }
  }
}

module.exports = EmailService;
