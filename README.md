# Avatar Frame Preview

See how an avatar frame looks across Instagram before you ask people to use it.

**Live page:** https://sitcon.org/avatar-frame/

Upload a photo, pick a frame (a PNG with a transparent centre), and the page shows the result in every spot an avatar appears:

| | Desktop | Mobile |
|---|---|---|
| Story ring (normal and Close Friends) | ✓ | ✓ |
| Post author | ✓ | ✓ |
| Own account (sidebar / navigation) | ✓ | ✓ |
| Chat list | ✓ | ✓ |
| Note (便利貼) | ✓ | ✓ |

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
| `src/scenes.json` | scene sizes and close-up crop rectangles |
| `public/scenes/`, `public/assets/` | redacted Instagram snapshots and the images they use, served as-is |
| `frames/` | frame artwork |
| `scripts/` | Node tools that talk to a real browser (below); not part of the site |

## How the scenes are made

`public/scenes/*.html` are static snapshots of instagram.com, taken from a logged-in browser over the Chrome DevTools Protocol and then redacted:

- every username, name, note, message and caption is replaced with a placeholder
- every photo is replaced with a placeholder image
- scripts, links, hidden and off-screen nodes and most attributes are removed
- CSS is pruned to the rules the snapshot still uses

Avatar slots carry `data-slot="avatar"`, and the previewer swaps them for the uploaded image.

## Scripts

These need a Chromium browser with remote debugging on port 9222, logged in to Instagram.

```sh
# regenerate public/scenes/, public/assets/ and src/scenes.json
pnpm scenes

# or take PNG screenshots of the live site with a given avatar
pnpm screenshots --avatar photo.jpg --frame frames/sitcon-2027-frame.png --out out
```

Both scripts open their own background tab and close it when done. Your account is never changed.

Instagram is a trademark of Meta. This project is not affiliated with Meta.
