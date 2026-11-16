# Avatar Frame Preview

See how an avatar frame looks across Instagram before you ask people to use it.

**Live page:** https://nat1anwastaken.github.io/ig-avatar-frame-preview/

Upload a photo, pick a frame (a PNG with a transparent centre), and the page shows the result in every spot an avatar appears:

| | Desktop | Mobile |
|---|---|---|
| Story ring (normal and Close Friends) | ✓ | ✓ |
| Post author | ✓ | ✓ |
| Own account (sidebar / navigation) | ✓ | ✓ |
| Chat list | ✓ | ✓ |
| Note (便利貼) | ✓ | ✓ |

Everything runs in the browser. Nothing is uploaded.

## How the scenes are made

`docs/scenes/*.html` are static snapshots of instagram.com, taken from a logged-in browser over the Chrome DevTools Protocol and then redacted:

- every username, name, note, message and caption is replaced with a placeholder
- every photo is replaced with a placeholder image
- scripts, links, hidden and off-screen nodes and most attributes are removed
- CSS is pruned to the rules the snapshot still uses

Avatar slots carry `data-slot="avatar"`, and the previewer swaps them for the uploaded image.

## Tools

Requires Node 22+ and a Chromium browser with remote debugging on port 9222, logged in to Instagram.

```sh
# regenerate the snapshots in docs/
node dump-scenes.mjs

# or take PNG screenshots of the live site with a given avatar
node ig-avatar-preview.mjs --avatar photo.jpg --frame frames/sitcon-2027-frame.png --out out
```

Both scripts open their own background tab and close it when done. Your account is never changed.

Instagram is a trademark of Meta. This project is not affiliated with Meta.
