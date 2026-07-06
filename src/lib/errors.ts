/**
 * Typed application errors. Route handlers / server actions map these to the
 * right HTTP status; the data-access layer (db/scoped.ts) and auth throw them.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {}
export class UnauthorizedError extends AppError {}
export class ForbiddenError extends AppError {}
export class ValidationError extends AppError {}
