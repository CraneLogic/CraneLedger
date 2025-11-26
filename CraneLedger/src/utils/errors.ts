export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class UnbalancedJournalError extends AppError {
  constructor(debitTotal: string, creditTotal: string) {
    super(400, `Journal entry is unbalanced: debits (${debitTotal}) != credits (${creditTotal})`);
  }
}

export class InvariantViolationError extends AppError {
  constructor(message: string) {
    super(400, `Invariant violation: ${message}`);
  }
}
