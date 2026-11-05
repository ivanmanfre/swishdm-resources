# Adding Jonathan's video

The page shows the text version until a video is set. The text stays under the video after.

**Option A, a file (simplest, no outside player):**

1. Name the file `before-your-call.mp4` and put it in `site/before-your-call/video/`.
   Keep it under 50 MB (GitHub refuses files over 100 MB). A 2 minute 1080p export at about 3 Mbps is around 45 MB.
2. In `site/before-your-call/page.mjs`, change the one line:
   `const VIDEO = '';` to `const VIDEO = 'video/before-your-call.mp4';`
3. Bump the `page.mjs?v=` number in `index.html` by one so phones load the new script.
4. Commit and `git push` to `main`. GitHub Pages publishes in about a minute.

**Option B, a YouTube (unlisted), Loom or Vimeo link:** paste the share link into the same line, for example
`const VIDEO = 'https://www.loom.com/share/abc123...';`, then steps 3 and 4.
Links show at 16:9. A vertical phone recording looks better as a file (option A), which keeps its own shape.

Check after: open https://madebyswishdm.com/before-your-call/ on a phone. The player sits above the text, with the line
"Prefer to read? Here's the same thing in text."
