# Regulations (Reglugerðir)

Home for the following regulation-related projects:

- The API responsible for\*
  - serving up regulation data (change history, Ministries, full-text search,
    etc.)
  - generating PDF files
  - adding new regulations or updating older regulations.
- The File server https://files.reglugerd.is which is responsible for serving up
  images that regulations inline, and PDF files generated by the API server.
- NPM package `@island.is/regulations-tools`

## Puppeteer

PDF generation is via Puppeteer, it's a bit of a hassle to get it running on
heroku:

- Use `https://github.com/heroku/heroku-buildpack-google-chrome` buildpack,
  before nodejs buildpack
- Run the `heroku-postbuild` script in the `package.json` file of the sub
  project
  - This moves the built chrome into the app folder which is then persisted by
    heroku
  - Postbuild also trumps the build command, so it also runs the build command

To debug, it's good to add `ls` and `pwd` commands to the `heroku-postbuild`
script.
