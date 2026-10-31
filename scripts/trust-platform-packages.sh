#!/bin/sh

# Configure GitHub Actions trusted publishing for the platform packages.
# The packages must already exist on npm (bootstrap placeholders are fine).
#
# Run interactively:
#   sh scripts/trust-platform-packages.sh
#
# The first command requires 2FA. npm offers a short window to skip further
# 2FA prompts, which this loop uses with --yes.

set -e

for package in \
  qpq-linux-x64 \
  qpq-linux-arm64 \
  qpq-linux-armv7 \
  qpq-darwin-x64 \
  qpq-darwin-arm64
do
  echo "Configuring trusted publisher for $package"
  npm trust github "$package" \
    --repo amoshydra/qpq \
    --file npm.yml \
    --allow-publish \
    --yes
  sleep 2
done

echo "Trusted publishers configured."
