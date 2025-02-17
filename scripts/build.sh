#!/usr/bin/env bash

# set -e -x
set -e

export DEBUG="@trex*"
export NODE_ENV=development
export DOTENV_CONFIG_PATH=.env.development

yarn workspaces foreach run clean

# build shared
yarn shared build

# build yttrex extension
yarn yt:ext build

# build tktrex extension
yarn tk:ext build

# build guardoni
yarn guardoni build
# yarn guardoni pkg
