#!/bin/bash
# FIXME: check if script is run without any folder path
# (i.e. `sh generate-model.sh` instead of `sh ./generate-model.sh`)
# and skip this cd step
cd "./${0%/*}/." # cd into project root

export $(egrep -v '^#' .env | xargs)

npx sequelize-typescript-generator@^4 --host ${MYSQL_HOST} --database ${MYSQL_DB} --username ${MYSQL_USER} --password ${MYSQL_PASS} --port ${MYSQL_PORT} --dialect mysql --skip-tables DBMeta,AuditLog,regulationarticle --clean --out-dir ./src/models

echo "WARNING: You MUST now manually review and edit the changes that occurred in 'src/models/*' BEFORE committing them"
