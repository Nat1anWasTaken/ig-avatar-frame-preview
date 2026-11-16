# Avatar Frame Preview

See how an avatar frame looks across Instagram and Facebook before you ask people to use it.

**Live page:** https://sitcon.org/avatar-frame/

Upload a photo, pick a frame (a PNG with a transparent centre), and the page shows the result in every spot an avatar appears. Instagram and Facebook each have a tab.

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
| `src/lib/` | shared state: avatar compositing and export (`editor.svelte.js`), frame presets and labels (`assets.js`) |
| `src/styles/` | colour tokens and global styles; component styles live in each `.svelte` file |
| `src/scenes.json` | scene sizes and close-up crop rectangles, per platform |
| `public/scenes/<platform>/`, `public/assets/<platform>/` | redacted snapshots and the images, icons and icon fonts they use, served as-is |
| `frames/` | frame artwork |
| `scripts/` | Node tools that talk to a real browser (below); not part of the site |

## How the scenes are made

`public/scenes/<platform>/*.html` are static snapshots of instagram.com and facebook.com, taken from a logged-in browser over the Chrome DevTools Protocol and then redacted:

- every username, name, note, message and caption is replaced with a placeholder
- every photo is replaced with a placeholder image
- scripts, links, hidden and off-screen nodes and most attributes are removed
- CSS is pruned to the rules the snapshot still uses

On Facebook, text is kept only when it is on a list of Facebook's own UI labels; anything else becomes a placeholder. Facebook's icons, sprites and icon fonts are public files and are copied into `public/assets/facebook/static/`. The notification rows are always made up: a real row is copied and filled in, so the account only needs one notification of any kind.

Avatar slots carry `data-slot="avatar"` (an `<img>`, or an SVG `<image>` on Facebook), and the previewer swaps them for the uploaded image.

## Scripts

These need a Chromium browser with remote debugging on port 9222, logged in to the platform.

```sh
# regenerate one platform's scenes, assets and entries in src/scenes.json
pnpm scenes --platform instagram
pnpm scenes --platform facebook
# re-dump only some scenes
pnpm scenes --platform facebook --only desktop-home,mobile-home

# or take PNG screenshots of the live site with a given avatar
pnpm screenshots --platform facebook --avatar photo.jpg --frame frames/sitcon-2027-frame.png --out out
```

`pnpm scenes` writes one leak report per scene to `out/leak-report/`: the original strings that are still in the snapshot (these should all be UI labels), and on Facebook also the strings it replaced, to spot UI labels missing from the list.

Both scripts open their own background tab and close it when done. They never post, follow or send anything. On mobile Facebook they press "Skip" or "Not now" on the "add friends" and "get the app" screens that cover the page.

Instagram and Facebook are trademarks of Meta. This project is not affiliated with Meta.
