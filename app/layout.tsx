import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nathan | Software Engineer Portfolio",
  description: "Space-themed portfolio showcasing software engineering projects, experience, and skills in full-stack development, data analysis, and coding instruction.",
  keywords: ["Nathan", "Software Engineer", "Portfolio", "Full Stack Developer", "Data Analyst", "React", "Next.js", "TypeScript"],
  authors: [{ name: "Nathan" }],
  creator: "Nathan",
  openGraph: {
    type: "website",
    title: "Nathan | Software Engineer Portfolio",
    description: "Explore my journey as a software engineer, data analyst, and coding instructor",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${dmSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
