#!/usr/bin/env bash

set -eo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
# shellcheck disable=SC1090,SC1091
source "${SCRIPT_DIR}/common.sh"

RELEASE_VERSION="${IMAGE_VERSION_TAG}"
HELM_STABLE_BRANCH="${HELM_STABLE_BRANCH:-"main"}"

echo "Releasing Helm Chart version ${RELEASE_VERSION}"

git config --global user.email "devops+circleci@speckle.systems"
git config --global user.name "CI"

git clone git@github.com:specklesystems/helm.git "${HOME}/helm"


sed -i 's/version: [^\s]*/version: '"${RELEASE_VERSION}"'/g' "${HOME}/utils/helm/speckle-server/Chart.yaml"
sed -i 's/appVersion: [^\s]*/appVersion: '\""${RELEASE_VERSION}"\"'/g' "${HOME}/utils/helm/speckle-server/Chart.yaml"
sed -i 's/docker_image_tag: [^\s]*/docker_image_tag: '"${RELEASE_VERSION}"'/g' "${HOME}/utils/helm/speckle-server/values.yaml"

rm -rf ~/helm/charts/speckle-server
if [[ -n "${CIRCLE_TAG}" || "${CIRCLE_BRANCH}" == "${HELM_STABLE_BRANCH}" ]]; then
  # before overwriting the chart with the build version, check if the current chart version
  # is not newer than the currently build one

  CURRENT_VERSION="$(grep ^version "${HOME}/helm/charts/speckle-server/Chart.yaml"  | grep -o '2\..*')"
  echo "${CURRENT_VERSION}"

  .circleci/check_version.py "${CURRENT_VERSION}" "${RELEASE_VERSION}"
  if [ $? -eq 1 ]
  then
    echo "The current helm chart version is newer than the currently built. Exiting" 
    exit 1
  fi
  cp -r "${HOME}/utils/helm/speckle-server" "${HOME}/helm/charts/speckle-server"
else
  # always overwrite
  sed -i 's/name: [^\s]*/name: '\""${BRANCH_NAME_TRUNCATED}-speckle-server"\"'/g' "${HOME}/utils/helm/speckle-server/Chart.yaml"
  cp -r "${HOME}/utils/helm/speckle-server" "${HOME}/helm/charts/${BRANCH_NAME_TRUNCATED}-speckle-server"
fi

cd ~/helm

git add .
git commit -m "CircleCI commit for version '${RELEASE_VERSION}'"
git push
