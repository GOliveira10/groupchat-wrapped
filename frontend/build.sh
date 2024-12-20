#!/bin/bash

ENV_FILE=$1
if [ -z "$ENV_FILE" ]; then
  echo "Usage: ./build.sh <env-file>"
  exit 1
fi

export $(cat $ENV_FILE | xargs) && docker build --build-arg ANALYSIS_API_URL=$ANALYSIS_API_URL -t wrapped-frontend .