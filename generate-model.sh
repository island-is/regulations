#!/bin/bash
cd "./${0%/*}" # cd into project root

export $(egrep -v '^#' .env | xargs)

stg -h ${MYSQL_HOST} -d ${MYSQL_DB} -u ${MYSQL_USER} -x ${MYSQL_PASS} -p ${MYSQL_PORT} -D mysql -T DBMeta,AuditLog,regulationarticle -c -o ./src/models
