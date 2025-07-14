import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import NextTopLoader from "nextjs-toploader";
export const metadata: Metadata = {
  title: "RetailVerse",
  description:
    "RetailVerse — Shop smarter with real-time store navigation, AI-powered search, and collaborative shopping pods.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3371FF",
          fontSize: "16px",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.ico" sizes="any" />
        </head>
        <body className="bg-gray-50" suppressHydrationWarning>
          <NextTopLoader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
