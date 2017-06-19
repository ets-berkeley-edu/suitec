#!/bin/bash

# Fail the entire script when one of the commands in it fails
set -e

echo_usage() {
  echo "SYNOPSIS"
  echo "     ${0} -d db_connection [-c canvas_hostname [-r replacement_canvas_hostname]] [-a]"; echo
  echo "DESCRIPTION"
  echo "Available options"
  echo "     -d      Database connection information in the form 'host:port:database:username'. Required."
  echo "     -a      Pull all database tables including the canvas table. Optional."
  echo "     -c      Hostname of the Canvas instance for which SuiteC course data should be pulled. Optional, defaults to all instances."
  echo "     -r      If provided, all references to Canvas-hosted resources will be changed to this hostname. Optional, requires -c."
}

while getopts "ac:d:r:" arg; do
  case ${arg} in
    a)
      all_tables=true
      ;;
    c)
      source_canvas="${OPTARG}"
      ;;
    d)
      db_params=(${OPTARG//:/ })
      db_host=${db_params[0]}
      db_port=${db_params[1]}
      db_database=${db_params[2]}
      db_username=${db_params[3]}
      db_password=${db_params[4]}
      ;;
    r)
      replacement_canvas="${OPTARG}"
      ;;
  esac
done

# Validation
[[ "${db_host}" && "${db_port}" && "${db_database}" && "${db_username}" ]] || {
  echo "[ERROR] You must specify complete database connection information."; echo
  echo_usage
  exit 1
}
[[ "${replacement_canvas}" ]] && ! [[ "${source_canvas}" ]] && {
  echo "[ERROR] A replacement Canvas hostname cannot be specified without also specifying a source Canvas instance."; echo
  echo_usage
  exit 1
}

if ! [[ "${db_password}" ]]; then
  echo -n "Enter database password: "
  read -s db_password; echo; echo
fi

if [[ "${replacement_canvas}" ]]; then
  echo "Will pull data for all courses hosted under ${source_canvas}, changing host references to ${replacement_canvas}."
elif [[ "${source_canvas}" ]]; then
  echo "Will pull data for all courses hosted under ${source_canvas}."
else
  echo "Will pull data for all courses."
fi
echo

output_csv() {
  # Connect to the source database and pipe the results of a supplied query to a CSV file in the local directory.
  echo "Copying ${1} from database..."
  PGPASSWORD=${db_password} psql -h ${db_host} -p ${db_port} -d ${db_database} --username ${db_username}\
  -c "copy (${2}) to stdout with (format csv, header true, force_quote *, delimiter '|')" > ${1}.csv
}

# Query each table for data associated with the supplied Canvas instance. The only table we do not query is the
# 'canvas' table itself.

# First, pull data from tables that contain no references to specific Canvas hostnames. Select by Canvas instance
# if that option is specified.

if [[ "${source_canvas}" ]]; then

  output_csv "activities" "select a.* from activities a
              join courses c
              on a.course_id = c.id and c.canvas_api_domain = '${source_canvas}'
              order by id"

  output_csv "activity_types" "select at.* from activity_types at
              join courses c
              on at.course_id = c.id and c.canvas_api_domain = '${source_canvas}'"

  output_csv "assets_categories" "select ac.* from assets_categories ac
              join (categories cat join courses c
                on cat.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on ac.category_id = cat.id"

  output_csv "asset_users" "select au.* from asset_users au
              join (users u join courses c
                on u.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on au.user_id = u.id"

  output_csv "categories" "select cat.* from categories cat
              join courses c
              on cat.course_id = c.id and c.canvas_api_domain = '${source_canvas}'"

  output_csv "chats" "select ch.* from chats ch
              join (users u join courses c
                on u.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on ch.user_id = u.id"

  output_csv "comments" "select com.* from comments com
              join (users u join courses c
                on u.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on com.user_id = u.id"

  output_csv "whiteboard_members" "select wm.* from whiteboard_members wm
              join (whiteboards w join courses c
                on w.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on wm.whiteboard_id = w.id"

  output_csv "users" "select u.* from users u
              join courses c
              on u.course_id = c.id and c.canvas_api_domain = '${source_canvas}'"

# If no source Canvas is specified, select all rows.

else

  output_csv "activities" "select * from activities order by id"
  output_csv "activity_types" "select * from activity_types"
  output_csv "assets_categories" "select * from assets_categories"
  output_csv "asset_users" "select * from asset_users"
  output_csv "categories" "select * from categories"
  output_csv "chats" "select * from chats"
  output_csv "comments" "select * from comments"
  output_csv "whiteboard_members" "select * from whiteboard_members"
  output_csv "users" "select * from users"

fi

# Next, pull data from tables that do contain references to specific Canvas hostnames.

# If the Canvas hostname should be changed, run a replace command on certain columns as part of the query.

if [[ "${replacement_canvas}" ]]; then

  output_csv "assets" "select a.id, a.type, a.url,
                replace(a.download_url, '${source_canvas}', '${replacement_canvas}') as download_url,
                a.title, a.canvas_assignment_id, a.description, a.thumbnail_url, a.image_url, a.mime,
                a.source, a.body, a.likes, a.dislikes, a.views, a.comment_count, a.created_at, a.updated_at,
                a.deleted_at, a.course_id, a.pdf_url, a.preview_status, a.preview_metadata, a.visible
              from assets a
              join courses c
              on a.course_id = c.id and c.canvas_api_domain = '${source_canvas}'"

  output_csv "asset_whiteboard_elements" "select awe.uid,
                replace(awe.element::text, '${source_canvas}', '${replacement_canvas}') as element,
                awe.created_at, awe.updated_at, awe.asset_id, awe.element_asset_id
              from asset_whiteboard_elements awe
              join (assets a join courses c
                on a.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on awe.asset_id = a.id"

  output_csv "courses" "select c.id, c.canvas_course_id, c.enable_upload, c.name,
                replace(c.assetlibrary_url, '${source_canvas}', '${replacement_canvas}') as assetlibrary_url,
                replace(c.dashboard_url, '${source_canvas}', '${replacement_canvas}') as dashboard_url,
                replace(c.engagementindex_url, '${source_canvas}', '${replacement_canvas}') as engagementindex_url,
                replace(c.whiteboards_url, '${source_canvas}', '${replacement_canvas}') as whiteboards_url,
                '${replacement_canvas}' as canvas_api_domain,
                c.active, c.created_at, c.updated_at, c.enable_daily_notifications, c.enable_weekly_notifications
              from courses c
              where c.canvas_api_domain = '${source_canvas}'"

  output_csv "whiteboards" "select w.id, w.title,
                replace(w.thumbnail_url, '${source_canvas}', '${replacement_canvas}') as thumbnail_url,
                replace(w.image_url, '${source_canvas}', '${replacement_canvas}') as image_url,
                w.created_at, w.updated_at, w.course_id, w.deleted_at
              from whiteboards w
              join courses c
              on w.course_id = c.id and c.canvas_api_domain = '${source_canvas}'"

  output_csv "whiteboard_elements" "select we.uid,
                replace(we.element::text, '${source_canvas}', '${replacement_canvas}') as element,
                we.created_at, we.updated_at, we.whiteboard_id, we.asset_id
              from whiteboard_elements we
              join (whiteboards w join courses c
                on w.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on we.whiteboard_id = w.id"

# If the Canvas hostname should not be changed, select all columns without changes.

elif [[ "${source_canvas}" ]]; then

  output_csv "assets" "select a.* from assets a
              join courses c
              on a.course_id = c.id and c.canvas_api_domain = '${source_canvas}'"

  output_csv "asset_whiteboard_elements" "select awe.* from asset_whiteboard_elements awe
              join (assets a join courses c
                on a.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on awe.asset_id = a.id"

  output_csv "courses" "select c.* from courses c
              where c.canvas_api_domain = '${source_canvas}'"

  output_csv "whiteboards" "select w.* from whiteboards w
              join courses c
              on w.course_id = c.id and c.canvas_api_domain = '${source_canvas}'"

  output_csv "whiteboard_elements" "select we.* from whiteboard_elements we
              join (whiteboards w join courses c
                on w.course_id = c.id and c.canvas_api_domain = '${source_canvas}')
              on we.whiteboard_id = w.id"

# If no source Canvas is specified, select all rows.

else

  output_csv "assets" "select * from assets"
  output_csv "asset_whiteboard_elements" "select * from asset_whiteboard_elements"
  output_csv "courses" "select * from courses"
  output_csv "whiteboards" "select * from whiteboards"
  output_csv "whiteboard_elements" "select * from whiteboard_elements"

fi

# If all tables are requested, pull the Canvas table as well.

if [[ "${all_tables}" ]]; then
  output_csv "canvas" "select * from canvas"
fi

echo "Done."

exit 0
