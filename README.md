# NordPlus API

API layer on top of the associated database.

## Installation

`yarn dev` builds and runs the project on port 3000 by default. TODO: Watch
functionality All routes can then be accessed under
`localhost:3000/api/v1/[route]`

# Routes

## Activity

`GET /api/v1/activities`

    Returns all activities

`GET /api/v1/activity/:id`

    Returns a single activity by id

## Authentication

`GET /api/v1/authentication/:id`

    Fetches the project with the associated id, then sends an email to the contact on file for that project
    that contains a JWT access token for editing an existing project.

## Contact

`GET /api/v1/contacts`

    Returns all contacts

`GET /api/v1/contact/:id`

    Returns a single contact by id

## Country

`GET /api/v1/countries`

    Returns all countries

`GET /api/v1/country/:id`

    Returns a single country by id

## Institution

`GET /api/v1/institutions`

    Returns all institutions

`GET /api/v1/institution/:id`

    Returns a single institution by id

## Programme

`GET /api/v1/programmes`

    Returns all programmes

`GET /api/v1/programme/:id`

    Returns a single programme by id

## Project

`GET /api/v1/projects`

    Returns all projects

`GET /api/v1/projectsPaged?skip=n&take=m&orderBy=id&orderDirection=ASC`

    Skips `n`amount of projects and gets an `m` amount.
    Defaults to order by article_date, descending.
    However it can be overwritten with `orderBy`and `orderDirection`

`GET /api/v1/project/:id`

    Returns a single project by id

`GET /api/v1/project?country=id1&type=id2&activity=id3&programme=id4&searchPhrase=text`

    Look for a project with search parameters which are optional.
    Query select gets more extensive with each parameter.
    Every parameter should be the ID of the associated database object we're searching for.
    Only the search phrase itself is a string.

`POST /api/v1/project`

    Expects a JSON payload containing all information related to a new project. Cascades a new institution and contact object when saving the project.
    Example payload:

    {
        "project": {
            "title": "Title of my project",
            "article": "Some long text here describing the project",
            "cooperation": "Jolly cooperation",
            "article_date": "2021-02-16",
            "activityId": 1,
            "programmeId": 1,
            "typeId": 1,
        }
        "contact": {
            "name": "The contact name",
            "phone": "The contact phone number",
            "fax": "You get the idea",
            "email": "realfakeemails@fakeemails.com"
        },
        "institution": {
            "name": "Institution",
            "website": "www.institution.com",
            "address": "Institution street",
            "countryId": 1
        }
    }

`PATCH /api/v1/project/:id`

    Updates an existing project. Same payload as for the post function.
    It also needs a JWT in the authentication header
    which matches information tied to the project. This JWT is created through the authentication route.
    Payload can be incomplete - existing data will be reused for fields that are empty / missing
    Example payload:

    {
        "project": {
            "title": "This title is much better",
            "type": 1
        }
        "contact": {
            "email": "longEmailsAreCool@hugsmidjan.is"
        },
        "institution": {
            "countryId": 1
        }
    }

## Type

`GET /api/v1/types`

    Returns all types

`GET /api/v1/type/:id`

    Returns a single type by id
