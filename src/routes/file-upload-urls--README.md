### `src/routes/fileUploadRoutes.ts`

endapunktur sem tekur við uploaded myndum úr ritlinum og uplódar þeim á S3.

Notar `FILE_UPLOAD_KEY_DRAFT` og `FILE_UPLOAD_KEY_PUBLISH` til að A)
samþykkja/hafna requestum (öryggismál) og B) velja folder til að uploda skránum
í. Sjá: `assertUploadType(req)`

- `env.FILE_UPLOAD_KEY_DRAFT`  
  er API lykilinn sem Admin kerfið á Ísland.is notar til að uploda myndum fyrir
  óútgefnar reglugerðir meðan þær eru enn í vinnslu.

- `env.FILE_UPLOAD_KEY_PUBLISH`  
  er API lykillinn sem tólið hans Sæmundar notar til að uplóda myndum fyrir
  published reglugerðir, **og** Admin kerfið mun nota til að uplóda myndum þegar
  reglugerð er endanlega gefin út.

- `env.MEDIA_BUCKET_FOLDER`  
  á alltaf að vera **non-empty** (t.d. `dev/valur`) í dev-mode en tóm í
  production. Við notum hann til að tryggja að allar myndir sem við uplódum
  meðan við erum að testa endapunktinn enda í sérstakri möppu sem hægt er að
  eyða:

      aws s3 --profile regulations rm --recursive  s3://island-is-reglugerd-media/dev

### `scripts/upload-documents-to-s3.ts`

Single-use scripta sem var búin til fyrir one-time upload á öllum myndum sem
voru í HTML-inu í gamla reglugerðagrunninum. Inniheldur gott stöff sem má
endurnýta í nýja `/api/v1/file-upload-urls` endapunktinn.

(ATH: incoming URL sem byrja á `/` túlkast sem `https://www.reglugerd.is/`)

`makeFileKey()` fallið þarf að uppfærast og verða almennara, þannig að öll
non-"reglugerd.is" og "www.stjornartidindi.is" hostnames séu samþykkt og endi
undir `/ext/[hostmame]`

ATH: í `FILE_UPLOAD_KEY_DRAFT` mode þarf `makeFileKey` að pefixa upload paths
með `${DRAFTS_FOLDER}/`

ATH: Jafnframt þarf fallið í `FILE_UPLOAD_KEY_PUBLISH` mode, að taka allar
slóðir sem byrja á `https://files.reglugerd.is/${DRAFTS_FOLDER}` að strippa burt
`DRAFTS_FOLDER` partinn

Endapunkturinn þarf að taka inn array af URLum:

```json
[
  "/media/file.jpg", // túlkað sem "https://www.reglugerd.is/media/file.jpg"
  "https://files.reglugerd.is/some-path/uploaded-image.jpg",
  "https://files.reglugerd.is/admin-drafts/some-path/uploaded-image.jpg",
  "https://www.stjornartidindi.is/foobar.aspx?blah",
  "https://www.somedomain.com/image.jpg"
]
```

og skila til baka map á forminu:

```json
// `FILE_UPLOAD_KEY_PUBLISH` mode:
{
  "/media/file.jpg": "https://files.reglugerd.is/media/file.jpg",
  "https://files.reglugerd.is/files/uploaded-image.jpg": "https://files.reglugerd.is/some-path/uploaded-image.jpg",
  "https://files.reglugerd.is/admin-drafts/some-path/uploaded-image.jpg": "https://files.reglugerd.is/some-path/uploaded-image.jpg", // fjarlægir "admin-drafts/"
  "https://www.stjornartidindi.is/foobar.aspx?blah": "https://files.reglugerd.is/stjornartidindi/foobar.aspx__q__blah",
  "https://www.somedomain.com/image.jpg": "https://files.reglugerd.is/ext/www.somedomain.com/image.jpg"
}
```

```json
// `FILE_UPLOAD_KEY_DRAFT` mode:
{
  "/media/file.jpg": "https://files.reglugerd.is/admin-drafts/media/file.jpg",
  "https://files.reglugerd.is/some-path/uploaded-image.jpg": "https://files.reglugerd.is/some-path/uploaded-image.jpg", // óbreytt
  "https://files.reglugerd.is/admin-drafts/some-path/uploaded-image.jpg": "https://files.reglugerd.is/admin-drafts/some-path/uploaded-image.jpg", // óbreytt
  "https://www.stjornartidindi.is/foobar.aspx?blah": "https://files.reglugerd.is/admin-drafts/stjornartidindi/foobar.aspx__q__blah",
  "https://www.somedomain.com/image.jpg": "https://files.reglugerd.is/admin-drafts/ext/www.somedomain.com/image.jpg"
}
```

Þetta map getur svo cleanup rútína á request endanum notað til að endurskrifa
myndaslóðirnar í reglugerðatextum áður en reglugerðin er vistuð.
