import type { ReactNode } from "react";

export const metadata = {
  title: "peek.gift",
  description: "Make a peek — a one-of-one gift page, built by chatting.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "-apple-system, system-ui, sans-serif", background: "#1a1518" }}>
        {children}
      </body>
    </html>
  );
}
