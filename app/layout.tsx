import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(protocol + "://" + host);
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: "GridPath AI — See the path to connection",
    description: "A decision workspace for grid interconnection screening and engineer review.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "GridPath AI — See the path to connection",
      description: "Surface connection risk, upgrade exposure, and the engineer decisions that move a project forward.",
      type: "website",
      images: [{ url: imageUrl, width: 1792, height: 896, alt: "GridPath AI grid connection intelligence" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "GridPath AI — See the path to connection",
      description: "Grid interconnection intelligence for projects that need to move.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
