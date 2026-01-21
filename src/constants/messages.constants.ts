export const USER_ALREADY_EXISTS = 'User already exist.';
export const USER_CREATED_SUCCESSFULLY = 'User created successfully.';
export const NO_USER_FOUND = 'User Not Found';

export const EMAIL_VERIFY_MESSAGE =
  'Please verify the code that was sent to your email.';
export const EMAIL_PASSWORD_INVALID = 'Email or password is invalid.';
export const EMAIL_ALREADY_VERIFIED = 'Email is already verified.';

export const LOGIN_SUCCESS_MESSAGE = 'You have successfully logged in!';
export const LOGOUT_CURRENT_DEVICE = 'You have logged out successfully!';

export const OTP_VERIFIED_MESSAGE = 'OTP verified successfully!';
export const OTP_SENT_MESSAGE = 'OTP sent successfully!';
export const OTP_NOT_EXIST = 'OTP does not exist for the provided email.';


export const NO_FILE_SELECTED = 'No file selected.';
export const UPLOAD_FILE_SUCCESSFULLY = 'File upload successfully.';

export const PASSWORD_UPDATED_MESSAGE = 'Password updated successfully.';

export const OLD_PASSWORD_NOT_MATCH='Invalid old password, please try again!';
export const  OTP_EXPIRED="OTP is expired."

export const INVALID_CREDENTIALS="Invalid email or password!"

export const USER_PROFILE_UPDATED_SUCCESSFULLY = 'Profile updated successfully.';


export function getUserNotFoundMessage(email: string): string {
  return `${NO_USER_FOUND}: ${email}`;
}


export const NotFound = (text:string) => {
  return `${text} not found`;
}


export const InvalidId = (text:string) => {
   return `Invalid ${text} id`;
}

export const IdRequired = (text:string) => {
  return `${text} ID is required`
}
export const AccessDenied = (text:string) => {
  return `Access denied to ${text}`
}

export const PAGELIMITPOSITIVE = "Page and limit must be positive numbers"