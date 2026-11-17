# AGENTS.md

This repository helps SITCON supporters create, preview and save artwork for their social media profiles. These instructions apply throughout the repository.

## Start here

- Inspect `git status --short` and preserve existing work.
- Read [README.md](README.md) for the current workflows, routes, source map, development commands and preview limitations. Inspect the relevant code and callers before editing.
- Use the Node and pnpm versions in `package.json` and the existing lockfile. Reuse Svelte, shared state and platform APIs before adding dependencies or abstractions.

## Product and copy

- Keep avatar creation, Facebook personal-profile covers and LINE profile backgrounds independent. Only a personal avatar requires a photo; covers and backgrounds remain directly available without completing another task.
- The purpose is voluntary support for SITCON through profile artwork. The annual theme supports that purpose; reading it, sharing an invitation or committing to attend must not become prerequisites.
- The audience is comfortable with technology. Let artwork, layout and precise labels explain the next action. Keep essential state, errors and accessible names; put detailed help behind optional disclosures.
- Use Taiwan Traditional Chinese for product copy and user communication. Use "社群媒體" for social media platforms and "社群" for a community of people. Keep this file in English.

## Images and state

- Keep photo processing in the browser. Do not send user images or identifying image data to servers, analytics or logs, or add persistent photo storage without a task requirement. Use synthetic or supplied sample images for testing.
- Composition and saving belong in `src/lib/editor.svelte.js`. Preserve valid work across failed or cancelled replacements and in-page task switches; the latest selection and confirmed preview must determine the saved output.
- A sample is not a personal result. Do not enable avatar saving before a valid photo and frame choice are ready. Download and system-share results must not claim the user changed their social profile.
- `src/campaigns/<year>/artwork/` contains released artwork. Do not redraw it as part of routine UI work. Investigate cropping against actual personal-profile layouts before proposing asset changes; Facebook Page specifications are not personal-profile specifications.
- Keep static scenes redacted, inert and free of scripts or tracking. Preserve `data-slot` markers used by `SceneView.svelte`; scene crop coordinates are not platform safe areas.

## Routes and deployment

- Asset imports and `pub()` in `src/lib/assets.js` must work under `/social-kit/`, including the annual entry. Keep legacy hash mappings in `src/lib/navigation.js` working.
- Keep annual copy, links, artwork and scoped palettes in `src/campaigns/<year>/`; keep editing and platform behavior shared. Each HTML entry explicitly selects a registered campaign with `data-campaign` and loads its theme. Never fall back to another year for a missing or unknown campaign.
- Keep campaign artwork, event links, filenames and static sharing metadata consistent. Follow the README's new-year steps; retain published annual entries and sharing URLs when changing the promoted campaign. Changing the general entry must not change older annual pages.
- Pushing `main` or triggering `.github/workflows/deploy.yml` publishes to GitHub Pages. Check the task's authorization for commits, publication and external entry-point changes separately from local edits.

## Verification and documentation

- Run `pnpm test` for code or build changes; it builds both static entries and runs the focused Node tests. Add behavior tests for non-trivial logic changes. Documentation-only edits need content, link and diff checks.
- For UI changes, inspect desktop and narrow layouts, keyboard access and the affected task flows. Image changes need failure/cancellation, state preservation and preview/output checks. Use the README validation guidance for platform and device checks.
- Report what was actually checked. Browser-size simulation and controlled image-I/O tests do not verify real phone saving, platform cropping or user understanding. Include screen evidence for visual claims.
- Keep README aligned with implemented behavior and known limitations. Keep this file limited to durable instructions. Record change rationale and verification evidence in commit or PR descriptions; do not retain session progress, candidate plans or reviewer transcripts in the repository.
