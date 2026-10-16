import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Nathan Tran | Portfolio",
  description: "Nathan Tran — software engineer, product engineer, and designer based in San Diego and Los Angeles. Explore selected work and get in touch.",
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
