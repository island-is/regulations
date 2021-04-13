# reglugerdir API

API layer on top of the associated database.

## Installation

`yarn dev` builds and runs the project on port 3000 by default.

`yarn dev-watch` runs the watch task in second terminal. All routes can then
be accessed under `localhost:3000/api/v1/[route]`

Set `process.env.PORT` to use a different port.

# Routes

## LawChapter

- `GET /api/v1/lawchapters`  
  Returns all lawchapters
- `GET /api/v1/lawchapters/tree`  
  Returns all lawchapters in tree view with subchapters

## Ministry

- `GET /api/v1/ministries`  
  Returns all ministries

## Years

- `GET /api/v1/years`  
  Returns all regulation years

## Regulations

- `GET /api/v1/regulations/newest`  
  `GET /api/v1/regulations/newest?page=2`  
  Returns all regulations ordered by publisheddate, 14 items per page

- `GET /api/v1/regulations/all/current`  
  `GET /api/v1/regulations/all/current/full`  
  `GET /api/v1/regulations/all/current/extra`  
  Returns all regulations ordered by publisheddate
  - full also returns text field for generic search
  - extra also returns text, law chapters and ministry for advanced search

## Regulation

- `GET /api/v1/regulation/:name/current`  
  Returns current version of a regulation with all changes applied
- `GET /api/v1/regulation/:name/diff`  
  Returns current version of a regulation with all changes applied, showing
  the total changes the "original" verion.
- `GET /api/v1/regulation/:name/original`  
  Returns original version of a regulation
- `GET /api/v1/regulation/:name/d/:date`  
  Returns a version of a regulation as it was on a specific `date`
- `GET /api/v1/regulation/:name/d/:date/diff`  
  Returns a version of a regulation as it was on a specific `date`, showing
  the changes that occurred on that date
- `GET /api/v1/regulation/:name/d/:date/diff/original` Returns a version of a
  regulation as it was on a specific `date`, showing the total chances since
  the "original" verion.
- `GET /api/v1/regulation/:name/d/:date/diff/:earilerDate` Returns a version
  of a regulation as it was on a specific `date`, showing the total chances
  since `earlierDate`

### Param types:

- `name` – Regulation publication name formatted as `nnnn-yyyy`. _(Example:
  `0221-2001`)_
- `date` – Valid ISODate _(Example: `2020-01-01`)_
- `earlierDate` – Valid ISODate _(Example: `2013-10-16`)_
