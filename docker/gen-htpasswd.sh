#!/bin/sh
# Runs as part of nginx's /docker-entrypoint.d/ before nginx starts.
# Requires BASIC_AUTH_USER and BASIC_AUTH_PASS env vars.
set -e

if [ -z "$BASIC_AUTH_USER" ] || [ -z "$BASIC_AUTH_PASS" ]; then
    echo "ERROR: BASIC_AUTH_USER and BASIC_AUTH_PASS must be set" >&2
    exit 1
fi

echo "$BASIC_AUTH_USER:$(openssl passwd -apr1 "$BASIC_AUTH_PASS")" > /etc/nginx/.htpasswd
echo "htpasswd generated for user: $BASIC_AUTH_USER"
