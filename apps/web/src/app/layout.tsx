
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
export const metadata: Metadata = {
  title: "ÉCLAT — Sound Intelligence Studio",
  description:
    "Explore acoustic differences between recordings through explainable sound analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><ThemeProvider>
    {children}
  </ThemeProvider></body>
    </html>
  );
}
