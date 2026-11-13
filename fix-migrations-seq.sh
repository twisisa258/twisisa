#!/usr/bin/env bash
set -e
cd ~/twisisa
node scripts/fix-seq.cjs
npm run migrate
