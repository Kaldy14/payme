export class PaymeError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "PaymeError";
    this.status = status;
    this.details = details;
  }
}
