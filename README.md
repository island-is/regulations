# reglugerdir API

API layer on top of the associated database.

## Installation

`yarn dev` builds and runs the project on port 3000 by default.
`yarn dev-watch` runs the watch task in second terminal.
All routes can then be accessed under `localhost:3100/api/v1/[route]`

# Routes

## LawChapter

`GET /api/v1/lawchapters`

    Returns all lawchapters

`GET /api/v1/lawchapters/tree`

    Returns all lawchapters in tree view with subchapters

## Ministry

`GET /api/v1/ministries`

    Returns all ministries

## Years

`GET /api/v1/years`

    Returns all regulation years

## Regulations

`GET /api/v1/regulations/newest`

    Returns all regulations ordered by publisheddate, 100 items per page

## Regulation

`GET /api/v1/regulation/nr/:name/original`

    Returns original version of a regulation

`GET /regulation/nr/:name/current`

    Returns current version of a regulation with all changes applied

`GET /regulation/nr/:name/diff`

    Returns current version of a regulation with all changes applied, in diff mode

`GET /regulation/nr/:name/d/:date`

    Returns a version of a regulation as it was on a specific date
