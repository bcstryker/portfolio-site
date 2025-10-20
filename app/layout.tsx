
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brandon Stryker, Software Engineer and Instructor",
  description: "Portfolio of Brandon Stryker, software engineer, CCSI, Cisco DevNet Professional, CCNA, Scrum Master."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">{children}</body>
    </html>
  );
}
