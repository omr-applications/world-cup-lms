import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Geist_Mono, Teko } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import "./globals.css";

const display = Teko({
  variable: "--font-teko",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Cup Last Man Standing",
  description: "Run World Cup Last Man Standing groups with Convex.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <html
      lang="en"
      className={`${display.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {hasConvexUrl ? (
          <ConvexAuthNextjsServerProvider>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ConvexAuthNextjsServerProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
