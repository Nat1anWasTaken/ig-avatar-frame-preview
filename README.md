# 換上 SITCON 2027

The kit for SITCON 2027's social media campaign: an avatar frame, a Facebook cover and a LINE profile background, with a preview of how each looks on Instagram, Facebook and LINE.

**Live page:** https://sitcon.org/social-kit/

Upload a photo and pick a frame (a PNG with a transparent centre). The page puts the framed avatar, together with each platform's banner, in every spot they appear, ready to download.

**Instagram**

| | Desktop | Mobile |
|---|---|---|
| Story ring (normal and Close Friends) | ✓ | ✓ |
| Post author | ✓ | ✓ |
| Own account (sidebar / navigation) | ✓ | ✓ |
| Chat list | ✓ | ✓ |
| Note (便利貼) | ✓ | ✓ |

**Facebook**

| | Desktop | Mobile |
|---|---|---|
| Post composer | ✓ | ✓ |
| Post author | ✓ | ✓ |
| Create story card | | ✓ |
| Own account (top bar / left menu) | ✓ | |
| Profile picture on your profile | ✓ | ✓ |
| Notification | ✓ | ✓ |
| Cover photo (on your profile) | ✓ | ✓ |

**LINE** (phone only)

| | Mobile |
|---|---|
| Profile picture and background on your profile | ✓ |

Messenger is not included: its chats are end-to-end encrypted and the web page shows none of them without a PIN.

Everything runs in the browser. Nothing is uploaded.

## Development

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev       # local dev server
pnpm build     # static site in dist/, deployed to GitHub Pages on every push to main
```

| Path | What it is |
|---|---|
| `index.html`, `src/main.js` | page shell and entry point |
| `src/App.svelte`, `src/components/` | the previewer UI as Svelte components (the editor sits in a sidebar on desktop and a bottom sheet on phones) |
| `src/lib/` | shared state: avatar compositing and saving (`editor.svelte.js`), frame presets, each platform's banner, and labels (`assets.js`) |
| `src/styles/` | colour tokens and global styles; component styles live in each `.svelte` file |
| `src/scenes.json` | scene sizes and close-up crop rectangles, per platform |
| `public/scenes/<platform>/`, `public/assets/<platform>/` | redacted snapshots and the images, icons and icon fonts they use, served as-is |
| `frames/`, `banners/` | avatar frame and platform banner artwork |

## Scenes

`public/scenes/<platform>/*.html` are static snapshots of instagram.com and facebook.com, saved from a logged-in browser and redacted by hand:

- every username, name, note, message and caption is replaced with a placeholder
- every photo is replaced with a placeholder image
- scripts, links, hidden and off-screen nodes and most attributes are removed

LINE has no web version, so `public/scenes/line/mobile-profile.html` is rebuilt by hand from a screenshot of the iOS app.

Image slots carry `data-slot`: `avatar` (an `<img>`, or an SVG `<image>` on Facebook) gets the framed avatar, and `cover` (Facebook) or `background` (LINE) gets that platform's banner. `src/scenes.json` lists each scene's size and close-up crop rectangles.

Instagram and Facebook are trademarks of Meta, and LINE is a trademark of LY Corporation. This project is not affiliated with either.
