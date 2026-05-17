// Datei: app/layout.tsx

import '../app/globals.css';  // Importiere die globalen Styles hier


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
      <html>
      <head>
        <title>Koffein Konto</title>
      </head>
      <body>{children}</body>
      </html>
  );
}