# Art icons

Icons in this folder are used automatically by the site (via the `ArtImg`
component). If a file is missing, the site falls back to built-in SVG art —
so you can add images gradually. **File names matter**; use PNG with
transparent or near-black background.

## Already present (cropped from the reference design)

| File | Used in |
| --- | --- |
| cat-all / cat-popular / cat-lottery / cat-crash / cat-wheel.png | category circles |
| game-wingo / game-crash.png | game cards |
| hero-chest.png | hero banner (welcome slide) |
| qa-people / qa-gift / qa-crown.png | quick action cards |
| vip-crown.png | VIP strip + /vip page |
| refer-gift.png | sidebar refer card |
| nav-promo.png | mobile bottom nav center button |
| trophy.png | Top Winners widget |

## Missing — generate these to complete the set

Use any AI image tool (Bing Image Creator is free). Base prompt style —
append the subject line for each file:

> Glossy 3D casino game icon, hyper realistic render, vibrant colors on
> dark background, dramatic red and purple neon lighting, subtle glow,
> centered composition, no text, square image

| File to save | Subject to add to prompt |
| --- | --- |
| `game-k3.png` | "three red and white dice mid-tumble" |
| `game-fived.png` | "five colorful numbered lottery balls in a row" |
| `game-mines.png` | "brilliant cyan diamond gem with sparkles" |
| `game-dice.png` | "single large red casino die" |
| `game-wheel.png` | "golden roulette wheel spinning, top view" |
| `cat-mines.png` | same as game-mines, inside a dark circle badge |
| `cat-dice.png` | same as game-dice, inside a dark circle badge |
| `qa-wallet.png` | "purple leather wallet with gold coins" |

Downscale to roughly 200–400px wide before saving (keeps the site fast).
Once a file is dropped in here with the right name, it appears on the site
after a refresh — no code changes needed.
