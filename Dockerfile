# Native modules (better-sqlite3, sodium-native, zlib-sync, @discordjs/opus)
# are compiled here, so the toolchain and its headers stay in this stage and
# never reach the image that ships.
FROM node:22-bookworm-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

# `npm ci` builds exactly what the lockfile pins, and --omit=dev leaves eslint
# and nodemon behind.
RUN npm ci --omit=dev


FROM node:22-bookworm-slim AS runtime

WORKDIR /usr/src/app

# Already built against this exact Node version in the stage above.
COPY --from=deps /usr/src/app/node_modules ./node_modules

# The bot spawns bare "ffmpeg" and "ffprobe", so they have to be on PATH.
# npm has already pulled fully static builds of both (ffmpeg-static directly,
# and @ffprobe-installer via get-audio-duration), so link those rather than
# apt-get installing a second copy - the apt one is a 300KB binary that drags
# in ~460MB of shared libraries.
#
# ffprobe arrives transitively and its path carries the platform in it, so
# assert both binaries are really there: a missing one should fail the build
# here rather than at the first attempt to play something.
RUN set -eux; \
    ffmpeg_bin=/usr/src/app/node_modules/ffmpeg-static/ffmpeg; \
    ffprobe_bin="$(find /usr/src/app/node_modules/@ffprobe-installer -name ffprobe -type f | head -1)"; \
    test -x "$ffmpeg_bin"; \
    test -x "$ffprobe_bin"; \
    ln -s "$ffmpeg_bin" /usr/local/bin/ffmpeg; \
    ln -s "$ffprobe_bin" /usr/local/bin/ffprobe; \
    ffmpeg -version; \
    ffprobe -version

COPY . .

# Stamped by CI so the running bot can say what shipped. Empty in a
# hand-built image, which is fine - nothing depends on them.
ARG APP_COMMIT=""
ARG APP_COMMIT_MESSAGE=""
ENV APP_COMMIT=$APP_COMMIT
ENV APP_COMMIT_MESSAGE=$APP_COMMIT_MESSAGE

CMD ["node", "src/index.js"]
