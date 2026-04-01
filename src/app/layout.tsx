import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BibAnalize – Análise Bibliométrica",
  description:
    "Plataforma de análise bibliométrica com dados Web of Science e OpenAlex. Desenvolvido por Matheus A. Capraro sob orientação da Prof.ª Dr.ª Ana Cristina K. Vendramin — PPGCA/UTFPR.",
  authors: [
    { name: "Matheus A. Capraro" },
    { name: "Ana Cristina K. Vendramin" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
