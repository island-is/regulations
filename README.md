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
`GET /api/v1/regulations/newest?page=2`

    Returns all regulations ordered by publisheddate, 14 items per page

`GET /api/v1/regulations/all/current`
`GET /api/v1/regulations/all/current/full`
`GET /api/v1/regulations/all/current/extra`

    Returns all regulations ordered by publisheddate
    - full also returns text field for generic search
    - extra also returns text, law chapters and ministry for advanced search

## Regulation

`GET /api/v1/regulation/nr/:name/original`

    Returns original version of a regulation

`GET /api/v1/regulation/nr/:name/current`

    Returns current version of a regulation with all changes applied

`GET /api/v1/regulation/nr/:name/diff`

    Returns current version of a regulation with all changes applied, in diff mode

`GET /api/v1/regulation/nr/:name/d/:date`

    Returns a version of a regulation as it was on a specific date

`GET /api/v1/regulation/nr/:name/d/:date/diff`

    Returns a version of a regulation as it was on a specific date, in diff mode
