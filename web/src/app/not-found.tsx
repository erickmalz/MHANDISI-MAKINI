import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-[1.75rem] font-bold text-foreground">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        This page has moved or never existed. Choose a project to carry on.
      </p>
      <div className="mt-6">
        <Button variant="primary" href="/">
          Choose a project
        </Button>
      </div>
    </main>
  );
}
