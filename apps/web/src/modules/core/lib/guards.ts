export function isOneOfValue<const T extends readonly string[]>(
  values: T,
  value: string
): value is T[number] {
  return values.includes(value as T[number]);
}
