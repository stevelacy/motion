#!/bin/sh

if [ $# -eq 0 ]; then
  echo 'Please specify package to release'
  exit 0
fi

if [ $1 = "tools" ]; then
  cd apps/tools/.flint
	npm version patch
	npm publish
  cd ../..
else
  cd packages/$1
  npm version patch
  npm publish
  cd ../..
fi

# git commit -am 'vbump'
# git push origin head