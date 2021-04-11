#!/bin/bash
cd "./${0%/*}" # cd into project root

export $(egrep -v '^#' .env | xargs)

typeorm-model-generator -h ${MYSQL_HOST} -d ${MYSQL_DB} -u ${MYSQL_USER} -x ${MYSQL_PASS} -p ${MYSQL_PORT} -e mysql
rm ./src/ormconfig.json ./src/tsconfig.json
