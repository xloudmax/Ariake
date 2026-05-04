# =============================================================================
# Ariake · backend (Go) Dockerfile
# Multi-stage: alpine builder → alpine runtime (need libc for sqlite_fts5 cgo).
# =============================================================================

FROM golang:1.25-alpine AS builder

# build-base provides gcc/musl-dev for cgo (sqlite); git for go mod;
# pkgconfig + sqlite-dev for the sqlite_fts5 build tag.
RUN apk add --no-cache git build-base pkgconfig sqlite-dev

WORKDIR /src

# Layer 1: cache module downloads
COPY go.mod go.sum ./
RUN go mod download

# Layer 2: source
COPY . .

# Build with sqlite FTS5 + symbol stripping. CGO required for go-sqlite3.
ARG GOFLAGS="-trimpath"
RUN GOFLAGS="${GOFLAGS}" CGO_ENABLED=1 \
    go build -tags 'sqlite_fts5 fts5' \
             -ldflags='-s -w' \
             -o /out/server main.go && \
    GOFLAGS="${GOFLAGS}" CGO_ENABLED=1 \
    go build -ldflags='-s -w' \
             -o /out/create_admin cmd/create_admin/main.go

# ---------------------------------------------------------------------------
FROM alpine:3.20 AS runtime

# Runtime: ca-certs for outbound TLS, sqlite-libs for cgo, tzdata for timezones,
# wget for HEALTHCHECK.
RUN apk add --no-cache ca-certificates sqlite-libs tzdata wget && \
    addgroup -S -g 1000 blog && \
    adduser  -S -u 1000 -G blog -H -D -s /sbin/nologin blog

WORKDIR /app

COPY --from=builder /out/server       /app/server
COPY --from=builder /out/create_admin /app/create_admin
# Schema needed at runtime for the GraphQL playground
COPY --from=builder /src/graph/schema.graphql /app/graph/schema.graphql

# Writable data dir for the (rare) SQLite case + uploads
RUN mkdir -p /app/data /app/uploads /app/logs && \
    chown -R blog:blog /app

USER blog

ENV GIN_MODE=release \
    PORT=11451 \
    BASE_PATH=/app/uploads \
    DATABASE_URL=/app/data/blog.db

EXPOSE 11451

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:11451/health/ping || exit 1

ENTRYPOINT ["/app/server"]
