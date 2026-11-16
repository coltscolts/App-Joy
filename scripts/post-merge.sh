#!/bin/bash
set -e
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @workspace/db run push
