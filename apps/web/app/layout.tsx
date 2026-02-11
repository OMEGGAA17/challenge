export const metadata = {
  title: 'Secure Transactions',
  description: 'Mini secure transaction service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
          background: 'radial-gradient(circle at top, #3b0764 0, #1e1b4b 40%, #020617 100%)',
          color: '#e5e7eb',
        }}
      >
        {children}
      </body>
    </html>
  );
}
