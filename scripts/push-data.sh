#!/bin/bash

# Fail the entire script when one of the commands in it fails
set -e

echo_usage() {
  echo "SYNOPSIS"
  echo "     ${0} -d db_connection [-a] [-i]"; echo
  echo "DESCRIPTION"
  echo "Available options"
  echo "     -d      Database connection information in the form 'host:port:database:username'. Required."
  echo "     -a      Push all database tables including the canvas table. Optional."
  echo "     -i      Mark all courses as inactive after push (may be desirable when populating a test environment). Optional."
}

# Default
inactivate_courses=false

while getopts "ad:i" arg; do
  case ${arg} in
    a)
      all_tables=true
      ;;
    d)
      db_params=(${OPTARG//:/ })
      db_host=${db_params[0]}
      db_port=${db_params[1]}
      db_database=${db_params[2]}
      db_username=${db_params[3]}
      db_password=${db_params[4]}
      ;;
    i)
      inactivate_courses=true
      ;;
  esac
done

# Validation
[[ "${db_host}" && "${db_port}" && "${db_database}" && "${db_username}" ]] || {
  echo "[ERROR] You must specify complete database connection information."; echo
  echo_usage
  exit 1
}

# Because of foreign key constraints, we must populate tables in order of association.
declare -a tables=(courses
                   users assets asset_users comments
                   activity_types activities
                   categories assets_categories
                   whiteboards whiteboard_members asset_whiteboard_elements whiteboard_elements chats)

# Prepend the canvas table only if requested.
if [[ "${all_tables}" ]]; then
  tables=(canvas ${tables[*]})
fi

# Check that all CSV files exist in the local directory.
for table in "${tables[@]}"; do
  [[ -f "${table}.csv" ]] || {
    echo "Aborting: file ${table}.csv not found in local directory."
    exit 1
  }
done

if ! [[ "${db_password}" ]]; then
  echo -n "Enter database password: "
  read -s db_password; echo; echo
fi

echo "WARNING: You are on the verge of deleting ALL existing course and user data from the database '${db_database}' at ${db_host}:${db_port}."
echo -n "To accept the consequences, type 'consentio': "
read confirmation; echo

[[ "${confirmation}" = 'consentio' ]] || {
  echo "Aborting."
  exit 1
}

echo "Clearing out existing data..."

# Truncate the canvas table if necessary.
if [[ "${all_tables}" ]]; then
  PGPASSWORD=${db_password} psql -h ${db_host} -p ${db_port} -d ${db_database} --username ${db_username} -c "truncate canvas cascade"; echo
fi

# Truncating course, user and category tables cascades along foreign key references and clears everything in one fell swoop.
PGPASSWORD=${db_password} psql -h ${db_host} -p ${db_port} -d ${db_database} --username ${db_username} -c "truncate courses cascade"; echo
PGPASSWORD=${db_password} psql -h ${db_host} -p ${db_port} -d ${db_database} --username ${db_username} -c "truncate users cascade"; echo
PGPASSWORD=${db_password} psql -h ${db_host} -p ${db_port} -d ${db_database} --username ${db_username} -c "truncate categories cascade"; echo

echo "Pushing local CSV data..."; echo

push_csv() {
  echo "Copying ${1} to database..."

  # Format the header row as a comma-separated list for the Postgres copy command.
  header_row=`head -1 ${1}.csv`
  columns=${header_row//|/,}

  # Load local CSV file contents into table.
  sql="copy ${1} (${columns}) from stdin with (format csv, header true, delimiter '|')"
  # Tables with an autoincrementing id column must reset the sequence after load.
  if [[ ${columns} == id* ]]; then
    sql+="; select setval('${1}_id_seq', (select max(id) from ${1}))"
  fi
  # If requested, mark all courses as inactive.
  if ${inactivate_courses} && [[ $1 == "courses" ]]; then
    echo "Will mark all courses as inactive."
    sql+="; update courses set active=false"
  fi

  # Connect to the database and execute SQL.
  cat ${1}.csv | PGPASSWORD=${db_password} psql -h ${db_host} -p ${db_port} -d ${db_database} --username ${db_username} -c "${sql}"
}

# Push CSV file contents to the database.
for table in "${tables[@]}"; do
  push_csv "${table}"
done

echo "Done."

exit 0
