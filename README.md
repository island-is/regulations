# reglugerdir API

API layer on top of the associated database.

## Installation

`yarn run dev` builds and runs the project on port 3000 by default, and
concurrently starts a watch task that rebuilds when source files change.

All routes can then be accessed under `localhost:3000/api/v1/[route]`

Set `process.env.PORT` to use a different port.

# Routes

## LawChapter

- `GET /api/v1/lawchapters`  
  `GET /api/v1/lawchapters?slugs=01,02a,36c`  
  Returns all lawchapters
  - optinally filter by lawchapter slugs
- `GET /api/v1/lawchapters/tree`  
  Returns all lawchapters in tree view with subchapters

## Ministry

- `GET /api/v1/ministries`  
  `GET /api/v1/ministries?slugs=fsr,dmr`  
  Returns all ministries
  - optinally filter by ministry slugs

## Years

- `GET /api/v1/years`  
  Returns all regulation years

## Regulations

- `GET /api/v1/regulations/newest`  
  `GET /api/v1/regulations/newest?page=2`  
  Returns all regulations ordered by publisheddate, 30 items per page
- `GET /api/v1/regulations/all/current/minimal`  
  Returns all current base regulations ordered by publisheddate
- `GET /api/v1/regulations/all/current/full`  
  Returns all current base regulations ordered by publisheddate
  - includes ministry and text field for generic search
- `GET /api/v1/regulations/all/extra`  
  Returns all regulations ordered by publisheddate
  - including text, law chapters and ministry for advanced search

## Regulation

- `GET /api/v1/regulation/:name/current`  
  Returns current version of a regulation with all changes applied
- `GET /api/v1/regulation/:name/diff`  
  Returns current version of a regulation with all changes applied, showing the
  total changes the "original" verion.
- `GET /api/v1/regulation/:name/original`  
  Returns original version of a regulation
- `GET /api/v1/regulation/:name/d/:date`  
  Returns a version of a regulation as it was on a specific `date`
- `GET /api/v1/regulation/:name/d/:date/diff`  
  Returns a version of a regulation as it was on a specific `date`, showing the
  changes that occurred on that date
- `GET /api/v1/regulation/:name/d/:date/diff/original`  
  Returns a version of a regulation as it was on a specific `date`, showing the
  total chances since the "original" verion.
- `GET /api/v1/regulation/:name/d/:date/diff/:earilerDate`  
  Returns a version of a regulation as it was on a specific `date`, showing the
  total chances since `earlierDate`

## Search

- `GET /api/v1/search?q=query&year=YYYY&yearTo=YYYY&rn=ministrySlug&ch=lawChapterSlug&iA=bool&iR=bool`  
  Searches regulations by query (q), year, ministry (rn) or lawchapter (ch)
  - optionally include amending (iA) or repelled (iR) regulations
- `GET /api/v1/search/recreate`  
  Recreates index db
- `GET /api/v1/search/repopulate`  
  Repopulates index db
- `GET /api/v1/search/update?name=:name`  
  Updates regulation item in index by `name`

## Redirects

- `GET /api/v1/redirects`  
  Returns redirects for all regulations marked as `Done`

### Param types:

- `name` – Regulation publication name formatted as `nnnn-yyyy`. _(Example:
  `0221-2001`)_
- `date` – Valid ISODate _(Example: `2020-01-01`)_
- `earlierDate` – Valid ISODate _(Example: `2013-10-16`)_
