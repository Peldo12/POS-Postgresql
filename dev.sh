#!/bin/bash

echo '===Development Checker==='

if [[ ! -f package.json ]]
then
  echo 'package.json not found'
  exit 1
fi

if [[ ! -f .env ]]
then
  echo '.env not found'
  exit 1
fi

if [[ ! -d node_modules ]]
then
  echo 'node_modules not found'
  echo 'running npm install'
  npm install
fi

echo 'running server ...'
npm run dev
