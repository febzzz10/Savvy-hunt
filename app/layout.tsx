import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Savvy Hunt — Inter-school championship",
    template: "%s | Savvy Hunt",
  },
  description:
    "Live scores, category results, schedules, and photographs from the Savvy Hunt inter-school championship.",
  openGraph: {
    title: "Savvy Hunt — Inter-school championship",
    description:
      "Follow every school, every event, and every result as the Savvy Hunt championship unfolds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
