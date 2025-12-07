export class ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  statusCode: number;

  constructor(
    statusCode: number,
    message: string,
    data?: T,
    success: boolean = true
  ) {
    this.success = success;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
  }
}
