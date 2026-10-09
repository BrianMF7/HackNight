// Normalised error thrown by both adapters so the UI renders one error shape.
export default class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN", fieldErrors = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors; // { fieldName: "message" } as returned by the backend
  }
}