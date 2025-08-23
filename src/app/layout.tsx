import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
