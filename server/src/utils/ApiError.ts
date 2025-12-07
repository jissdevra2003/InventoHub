export class ApiError extends Error {
  statusCode: number;
  success: boolean;

  constructor(statusCode: number, message: string="Something went wrong") {
    super(message);
    this.success = false;
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}
