# ~/mcp-erpnext/Dockerfile

# ── Stage 1: build the UI viewers (needs Node/npm, not present in the Deno image) ──
# Base images are pinned by digest, not tag: a tag is mutable and silently
# re-points, which would make this build unreproducible. Refresh a digest
# deliberately, never implicitly.
FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS ui-builder
WORKDIR /app/src/ui
COPY src/ui/package.json src/ui/package-lock.json ./
RUN npm ci
COPY src/ui/ ./
RUN node build-all.mjs

# ── Stage 2: runtime ────────────────────────────────────────────────────────
# Deno 2.9.5. The floor is 2.9: `minimumDependencyAge` in deno.json is only
# honoured from that release on, and unknown config keys are ignored rather
# than rejected — so an older Deno runs this build with the supply-chain gate
# silently doing nothing.
FROM denoland/deno:2.9.5@sha256:b429777c3dcff34a6488f365a1537db1640b2d48379b60f5e6206be034472463

WORKDIR /app
COPY . .
COPY --from=ui-builder /app/src/ui/dist ./src/ui/dist

# Pre-cache all dependencies so startup is fast.
# --frozen: fail the build if resolution would differ from the committed
# deno.lock, rather than silently writing a new one.
RUN deno cache --frozen --allow-import server.ts

EXPOSE 7654

CMD ["run", "--frozen", "--allow-all", "server.ts", "--http", "--port=7654", "--hostname=0.0.0.0"]
