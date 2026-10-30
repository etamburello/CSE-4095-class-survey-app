export function AuthStatus({ message }: { message: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-stone-50 px-4">
      <p role="status" className="text-stone-700">
        {message}
      </p>
    </main>
  )
}
