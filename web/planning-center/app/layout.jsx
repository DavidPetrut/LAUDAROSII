import "./globals.css";
import { AiProvider } from "@/lib/ai/AiProvider";

export const metadata = {
  title: "Servicii — Vertical București",
  description: "Planning Center (web) — Songs. Aceeași bază de date și API ca aplicația mobilă.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        {/* AI-ul e montat la rădăcină => global, prezent pe orice ecran (§10). */}
        <AiProvider>{children}</AiProvider>
      </body>
    </html>
  );
}
