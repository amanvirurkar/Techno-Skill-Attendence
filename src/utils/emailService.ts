import emailjs from '@emailjs/browser';

const ADMIN_OTP_STORAGE_KEY = 'adminOTP';

const getEmailConfig = () => {
  const serviceId = import.meta.env.VITE_EMAIL_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAIL_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Email service is not configured');
  }

  return { serviceId, templateId, publicKey };
};

export const sendEmail = async (toEmail: string, toName: string, message: string) => {
  const { serviceId, templateId, publicKey } = getEmailConfig();

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: toEmail,
        to_name: toName,
        message,
      },
      publicKey
    );
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email failed:', error);
    throw error;
  }
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTPEmail = async (email: string, name = 'User') => {
  const otp = generateOTP();
  localStorage.setItem(ADMIN_OTP_STORAGE_KEY, otp);

  await sendEmail(
    email,
    name,
    `Your login OTP is: ${otp}`
  );

  return otp;
};

export const sendAdminOTP = sendOTPEmail;

export const verifyOTP = (inputOTP: string) => {
  const storedOTP = localStorage.getItem(ADMIN_OTP_STORAGE_KEY);
  return inputOTP === storedOTP;
};

export const clearStoredOTP = () => {
  localStorage.removeItem(ADMIN_OTP_STORAGE_KEY);
};

export const sendAttendanceStatusEmail = async (
  email: string,
  name: string,
  status: 'present' | 'absent',
  reason = ''
) => {
  const message = status === 'absent'
    ? `You are marked ABSENT today.\nReason: ${reason}`
    : 'You are marked PRESENT today. Keep it up!';

  await sendEmail(email, name, message);
};
