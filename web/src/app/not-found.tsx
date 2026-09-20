import { Button } from "@/components/ui/Button";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-[1.75rem] font-bold text-foreground">{t("chrome.notFound.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("chrome.notFound.body")}</p>
      <div className="mt-6">
        <Button variant="primary" href="/">
          {t("chrome.notFound.action")}
        </Button>
      </div>
    </main>
  );
}
