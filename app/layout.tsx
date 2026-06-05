// app/layout.tsx
import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import "./globals.css";

export const metadata: Metadata = {
  title: "Preproute — Test Management System",
  description: "Manage tests, topics, subjects, questions and schedule publishes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-gray-50">
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
