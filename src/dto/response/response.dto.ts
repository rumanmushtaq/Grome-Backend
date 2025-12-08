import { number } from 'joi';

export class ResponseDto {
  success: boolean;
  message: string;
  data?: any;
  actualLimit?: number;
  actualPage?: number;
  totalPages?: number;
  totalDoc?: number;
  status?: number;
  constructor(
    success: boolean,
    message: string,
    data?: any,
    actualLimit?: number,
    actualPage?: number,
    totalPages?: number,
    totalDoc?: number,
    status?: number,
  ) {
    this.success = success;
    this.message = message;
    this.status = status;
    this.data = data;
    this.actualLimit = actualLimit;
    this.totalPages = totalPages;
    this.actualPage = actualPage;
    this.totalDoc = totalDoc;
  }
}
