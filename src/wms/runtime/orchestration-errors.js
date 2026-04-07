export class OrchestrationBlockedError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'OrchestrationBlockedError';
    this.code = 'ORCHESTRATION_BLOCKED';
    this.details = details;
  }
}
