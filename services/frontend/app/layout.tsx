import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import VisitorActivityTracker from "@/components/VisitorActivityTracker";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "flipflop.alfares.cz - Modern FlipFlop Platform",
  description: "Modern, fully automated FlipFlop platform for the Czech Republic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="light">
      <body className={`${inter.className} bg-white text-slate-900 antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={null}>
              <VisitorActivityTracker />
            </Suspense>
            <Header />
            <main className="min-h-screen">{children}</main>
            <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-8 mt-16">
              <div className="container mx-auto px-4 text-center">
                <p>&copy; {new Date().getFullYear()} flipflop.alfares.cz. Všechna práva vyhrazena.</p>
              </div>
            </footer>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
