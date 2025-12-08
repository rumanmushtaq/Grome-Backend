export interface ISendOTPEmailPayload {
  name: string;
  to: string;
  subject: string;
  otp: number;
}

export interface IExportReadyEmailPayload {
  name: string;
  to: string;
  subject: string;
  link: string;
}

export interface ISendInvitationEmailPayload {
  to: string;
  interviewerId: string;
}

export interface ISendEmail {
  to: string | string[];
  subject: string;
  html: any;
}

export interface IContactSupportEmailPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}
