import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="mx-auto max-w-md text-center space-y-6">
        <h1 className="font-heading text-7xl font-bold text-primary">404</h1>
        <div className="space-y-2">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Page not found
          </h2>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Button render={<Link href="/dashboard" />} size="lg">
          <Home className="size-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
