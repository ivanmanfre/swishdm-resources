# madebyswishdm.com

GitHub Pages site for SwishDM's own domain. Published by `.github/workflows/pages.yml`
from `site/` on every push to `main`.

| Path | What it is |
|---|---|
| `/` | Redirect to https://swishdm.com/ (noindex) |
| `/board/` | SwishDM's content board (white-label build of the client board, slug `swishdm-live`) |
| anything else | `404.html` sends visitors to https://swishdm.com/ (noindex); stray `/board/...` paths go back to `/board/` |

`site/board/` is generated. Do not edit it by hand: it is rebuilt from the
`ivanmanfre/personal` repo (`scripts/publish-board-host.sh swishdm --push`, also run by
that repo's `swishdm-board-mirror` deploy job on every push to its `main`).

Resource and worksheet pages go in their own folder under `site/` (for example
`site/buyer-comparison-worksheet/`). `/ai-buyer-scan` is reserved and redirects to
swishdm.com until it ships.
