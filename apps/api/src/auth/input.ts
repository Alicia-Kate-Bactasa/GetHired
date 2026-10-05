import { ApiError } from "../api/errors.js"

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError("VALIDATION_ERROR")
  return value as Record<string, unknown>
}
export function loginInput(value: unknown) {
  const data = object(value)
  if (
    Object.keys(data).some(
      (key) => !["identifier", "password", "rememberMe"].includes(key),
    ) ||
    typeof data.identifier !== "string" ||
    data.identifier.trim().length > 254 ||
    !/^(?:\d{8}|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(data.identifier.trim()) ||
    typeof data.password !== "string" ||
    data.password.length < 1 ||
    data.password.length > 4096 ||
    (data.rememberMe !== undefined && typeof data.rememberMe !== "boolean")
  )
    throw new ApiError("VALIDATION_ERROR")
  return {
    identifier: data.identifier.trim().toLowerCase(),
    password: data.password,
    rememberMe: data.rememberMe === true,
  }
}
export function emptyInput(value: unknown) {
  if (Object.keys(object(value)).length) throw new ApiError("VALIDATION_ERROR")
}
