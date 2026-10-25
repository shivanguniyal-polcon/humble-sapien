export class ProjectInputError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ProjectInputError';
    this.details = details;
  }
}
