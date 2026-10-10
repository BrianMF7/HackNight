// Normalised error thrown by both adapters so the UI renders one error shape.
export default class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, fieldErrors?: Record<string, string> }} [options]
   */
  constructor(message, { status = 0, code = "UNKNOWN", fieldErrors = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors; // { fieldName: "message" } as returned by the backend
  }
}

/**
 * @typedef {{ message?: string, status?: number, data?: { extra_data?: { reason?: string } } }} ErrorShape
 * @param {unknown} error
 * @returns {error is ErrorShape}
 */
export function isErrorShape(error) {
  return typeof error === "object" && error !== null;
}