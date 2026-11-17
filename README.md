# 換上 SITCON 2027

A browser-only kit for supporting SITCON through personal social media profiles. Choose an avatar frame, a Facebook profile cover or a LINE profile background independently.

- **Avatar:** choose a photo directly from the overview, adjust its position and zoom, then download or share a 1080 × 1080 PNG. Returning to the overview offers continuing the existing edit. The official frame is preselected; custom frames and no frame are secondary options. The example avatar cannot be downloaded or shared as a personal result.
- **Cover and background:** save the released artwork directly, without choosing a photo. Optional previews show the profile context and possible cropping.
- **Preview:** compare avatar sizes and optionally inspect redacted Instagram, Facebook and LINE scenes. These are static illustrations, not a guarantee of current platform layouts.

## Design

The overview presents all three uses before platform-preview controls, so supporters can choose what fits their profile. The workspace defaults to avatar creation; crop and save controls appear after a photo is selected. Covers and backgrounds can be saved from the overview without entering the workspace. Using one item is a complete form of participation, with no attendance or sharing requirement.

The annual theme supports identification with SITCON while keeping artwork selection central. The theme link goes directly to [the 2027 theme discussion](https://sitcon.org/2027/cfp/#theme). Artwork, layout and concise Taiwan Traditional Chinese labels explain the main actions; detailed help and additional previews are optional.

The app processes photos locally and does not upload them or persist the editing session across reloads. Switching artwork within the page preserves the current photo and crop. A download request or completed system share does not mean the social media profile has been changed. Invitation text uses a neutral invitation and the annual tool URL.

Download and system share are separate actions for all three artwork types. Download always requests a browser download; it never opens the system share sheet. Sharing is shown when file sharing is supported, with files prepared before the click so fetching does not consume the required user activation. Preparation does not block downloading; a failed preparation can be retried, and a cancelled or failed share never starts a download automatically.

The optional “儲存與換圖” disclosure contains a full-image fallback and a short instruction for the selected artwork. “找不到圖片？” after a download opens that artwork's full image directly within the page, preserving the photo and crop. The avatar image uses the same confirmed output as download and sharing. Browser downloads may go to Files rather than Photos; long-press image saving and the share sheet's save options depend on the browser, operating system and installed apps. These controls cannot guarantee saving to the photo library or directly set a social profile.

## Routes

The deployment base is `/social-kit/`. The build produces both entries:

| Path | Purpose |
| --- | --- |
| `/social-kit/` | General entry, showing the 2027 kit |
| `/social-kit/2027/` | Annual campaign entry with 2027 sharing metadata |

Use `#avatar`, `#facebook` or `#line` for a particular task. The earlier `#instagram` link opens the avatar editor.

Legacy campaign links such as `https://i.sitcon.org/frame/` carry the 2027 avatar invitation. Preserve that year and purpose when coordinating changes to their destinations.

Each HTML entry explicitly selects its campaign with `data-campaign`. Both current entries select `2027`; `src/campaigns/index.js` resolves that year and rejects missing or unknown values. The app currently offers only 2027, with no year picker or historical collection. Public campaign links and their previews must continue to deliver the year they advertised.

## Campaigns and future years

Annual copy, links, released artwork and the color palette live together in `src/campaigns/2027/`. The editor, controls and platform scenes remain shared. HTML entries keep their sharing metadata static so link previews do not depend on JavaScript. The public sharing image is an intentional separate copy with a stable URL.

To add a year:

1. Add `src/campaigns/<year>/` with its `index.js`, `artwork/` and `theme.css`, following the existing campaign's three artwork types. Register it in `src/campaigns/index.js`.
2. Add `<year>/index.html`, explicitly select that year, load its scoped theme and set its static title, description, canonical and Open Graph metadata. Add its sharing image under `public/social/` and its HTML entry to `vite.config.js`; retain all published annual entries.
3. Extend the campaign and built-entry tests. Check both the new year and 2027 directly, including default frames, download names, event links, scenes and share cards. Change the general `index.html` entry only when the promoted campaign changes; never derive it from the calendar year.

The shared layout still contains component styling. A future visual identity may need targeted layout or style work in addition to its annual palette; the campaign directory is not a promise that every design can be expressed as data.

## Development

Use the Node and pnpm versions in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev       # local development
pnpm build     # static output in dist/
pnpm test      # build, then image-state, route and annual-entry tests
pnpm preview   # serve the production build locally
```

| Path | Responsibility |
| --- | --- |
| `index.html`, `2027/index.html`, `vite.config.js` | Static entries, deployment base and sharing metadata |
| `src/App.svelte`, `src/styles/` | Artwork overview, workspace, invitation and responsive layout |
| `src/components/Editor.svelte`, `AvatarCanvas.svelte`, `FilePicker.svelte`, `FramePresets.svelte`, `ExportActions.svelte` | Photo selection, crop controls, optional frames and download/share actions |
| `src/components/SocialPreview.svelte`, `SceneView.svelte`, `Tabs.svelte` | Size comparison and optional platform scenes |
| `src/lib/editor.svelte.js` | Image composition, asynchronous state, object URLs and saving |
| `src/campaigns/index.js`, `src/campaigns/<year>/` | Explicit year selection, annual copy, links, released artwork and scoped palette |
| `src/lib/assets.js`, `navigation.js` | Selected campaign's assets, shared platform definitions, public paths and legacy hash mapping |
| `src/scenes.json`, `public/scenes/`, `public/assets/` | Scene dimensions, redacted HTML and supporting assets |
| `public/social/` | Annual sharing image, copied unchanged from the Facebook artwork |
| `tests/` | Node tests; image I/O is controlled rather than a real browser |

## Preview limitations

Instagram and Facebook scenes are static, redacted snapshots. Names, photos, messages and captions are placeholders; scripts and tracking have been removed. LINE's mobile profile is reconstructed from an iOS screenshot. Scene iframes are inert and exposed as a labeled illustration, so their placeholder controls do not enter keyboard or screen-reader navigation.

`data-slot="avatar"` receives the generated avatar; `cover` and `background` receive the platform artwork. Keep these markers aligned with `SceneView.svelte` when updating scenes. Crop rectangles in `scenes.json` are view coordinates, not platform safe areas.

| Released artwork | Limitation to check |
| --- | --- |
| Avatar frame, 1080 × 1080 | SITCON sits along the lower edge and 2027 near the upper right. Check circular clipping and recognition at the 40 px preview size. |
| Facebook cover, 851 × 315 | The [mobile profile scene](public/scenes/facebook/mobile-profile.html) fills a 390 × 260 cover area, leaving source x = 189.25–661.75 visible. Left-side branding and event details can be cropped. Confirm the actual personal-profile layout before changing artwork; do not substitute Facebook Page specifications. |
| LINE background, 1080 × 1920 | The [mobile profile scene](public/scenes/line/mobile-profile.html) fills 390 × 844, leaving source x ≈ 96.4–983.6 visible. This single model does not cover other phone ratios or how friends see the profile. |

These are properties of the included simulations, not verified platform specifications. The sharing image reuses the released Facebook artwork; its text metadata names all three uses, but the image is not a composite of all three outputs.

## Validation and deployment

`pnpm test` checks asynchronous image state, output consistency, independent download/share behavior, preparation failures, explicit campaign selection, legacy hashes, built entry paths and sharing metadata. Image and sharing APIs are controlled in these tests; they do not replace browser checks.

For UI changes, check desktop and 320/390 px layouts, keyboard and touch controls, all three independent tasks, invalid and cancelled photo replacements, task switching and the saved image against the preview. Check that the overview opens the photo picker directly, cancellation stays in place, and continuing an edit preserves the crop. Exercise download, share preparation/retry, cancelled and failed sharing, and the full-image fallback separately; downloading must remain available during share preparation. For annual-entry changes, open both built paths directly, reload asset links and check browser history. Before publishing, verify saving and cancellation on real phones and in-app browsers, actual personal-profile cropping and social link cards. Confirm users can find the exported image in the target app's picker and understand the next action; a working download does not establish adoption.

Pushing `main` or manually triggering `.github/workflows/deploy.yml` runs `pnpm test` before publishing the `dist/` output to GitHub Pages. A failed build or test prevents deployment. Official website links, short links and social media posts are managed separately; verify their destination and year when coordinating a release.

Instagram and Facebook are trademarks of Meta; LINE is a trademark of LY Corporation. This project is not affiliated with those companies.
