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
  title: "Nathan Tran | Portfolio",
  keywords: ["Nathan", "Software Engineer", "Portfolio", "Full Stack Developer", "Blockchain Developer", "Automation Developer", "Cognitive Science", "Machine Learning", "Neural Computation", "Computer Science", "Engineering", "UCSD",  "React", "Next.js", "TypeScript"],
  authors: [{ name: "Nathan" }],
  creator: "Nathan",
  openGraph: {
    type: "website",
    title: "Nathan | Software Engineer Portfolio",
    description: "Explore my journey as a software engineer, product developer, automation developer, cognitive science student, and more",
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
