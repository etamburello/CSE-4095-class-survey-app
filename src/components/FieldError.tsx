export function FieldError({
  id,
  children,
}: {
  id?: string
  children?: string
}) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-700">
      {children}
    </p>
  )
}
