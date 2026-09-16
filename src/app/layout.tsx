import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/features/install-prompt/InstallPrompt";
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Tickle AI",
  description: "Assistente lÃ³gico multimodal avanÃ§ado",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tickle AI",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${roboto.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                        mutation.target.removeAttribute('bis_skin_checked');
                      }
                      if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                          if (node.nodeType === 1 && node.hasAttribute('bis_skin_checked')) {
                            node.removeAttribute('bis_skin_checked');
                          }
                        });
                      }
                    });
                  });
                  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ['bis_skin_checked'] });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          
            {children}
            <InstallPrompt />
            <Toaster position="top-center" />
          
        </ThemeProvider>
      </body>
    </html>
  );
}

