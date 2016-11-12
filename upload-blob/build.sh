#!/bin/bash

docker build -t blob-maker .
docker run -v `pwd`/output:/output -it blob-maker bash -c 'cp *.js /output'
