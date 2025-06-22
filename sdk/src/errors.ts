export class AppError extends Error {
  constructor(public code: string, public statusCode = 500, message?: string, public cause?: Error) {
    super(message ?? code, { cause });
    this.name = this.constructor.name;
  }
}
export class ValidationError extends AppError {
  constructor(public details: unknown) {
    super('VALIDATION_ERROR', 400, 'Validation failed');
  }
}
export class MessageExpiredError extends AppError {
  constructor(id: string) {
    super('MESSAGE_EXPIRED', 410, `Message ${id} has expired`);
  }
}
