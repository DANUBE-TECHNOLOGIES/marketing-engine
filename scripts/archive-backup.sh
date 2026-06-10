#!/bin/bash

LATEST=$(ls -td backups/* | head -1)

tar -czf ${LATEST}.tar.gz $LATEST

echo "Archive créée : ${LATEST}.tar.gz"
