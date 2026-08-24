import "./theme.css";
import "./globals.css";
import "./club.css";
import "./legal.css";
import PlatformRoot from "./PlatformRoot";
import { BRAND_NAME } from "@/lib/brand";
import { ArtOverridesProvider } from "@/components/ArtImg";
import { getGameArtOverrides } from "@/lib/gameArt";

export const metadata = {
  title: `${BRAND_NAME} — Gaming Platform`,
  description: "Play Wingo, win real rewards" };

export default async function RootLayout({ children }) {
  const overrides = await getGameArtOverrides();

  return (
    <html lang="en">
      <body className="club-body">
        <ArtOverridesProvider overrides={overrides}>
          <PlatformRoot>{children}</PlatformRoot>
        </ArtOverridesProvider>
      </body>
    </html>
  );
}
