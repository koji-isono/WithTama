/** Webhook handler failure — triggers 500 and claim release for Stripe retry. */
export class WebhookHandlerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WebhookHandlerError";
    this.code = code;
  }
}
