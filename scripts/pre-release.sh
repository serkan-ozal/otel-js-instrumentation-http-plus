#!/bin/bash

CURRENT_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
COMMIT_ID=$(git rev-parse HEAD)

echo "Current version: $CURRENT_VERSION"
echo "Current branch name: $BRANCH_NAME"

echo "Installing dependencies ..."
npm install
echo "Installing completed"

echo "Building ..."
npm run build
echo "Build completed"

PRE_RELEASE_TAG=${PRE_RELEASE_PHASE}/${BRANCH_NAME}

echo "Publishing ${PRE_RELEASE_PHASE} release with ${PRE_RELEASE_TAG} tag ..."

npm version ${RELEASE_SCALE} --force --no-git-tag-version
NEW_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
PRE_RELEASE_VERSION=${NEW_VERSION}-${PRE_RELEASE_PHASE}.$(date '+%Y%m%d%H%M%S')

echo "Bumping to pre-release version: ${PRE_RELEASE_VERSION} ..."
npm version ${PRE_RELEASE_VERSION} --force --no-git-tag-version

npm publish --tag ${PRE_RELEASE_TAG}

echo "Published ${PRE_RELEASE_PHASE} release with ${PRE_RELEASE_TAG} tag"
