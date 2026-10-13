# DatingApp

The dating app I built in 2020 while following an ASP.NET Core and Angular training course,
upgraded in 2026 to current versions of .NET and Angular so it runs again.

Members can register, log in, browse and filter matches, view profiles with a photo gallery,
edit their own profile, upload photos and pick a main photo, like other members,
and send each other messages.

| Part | Tech | Runs on |
| --- | --- | --- |
| `DatingApp.api` | .NET 10, ASP.NET Core, EF Core 10 + SQL Server LocalDB | http://localhost:5000 |
| `DatingApp-SPA` | Angular 22, Bootstrap 4, ngx-bootstrap | http://localhost:4200 |
| `DatingApp.api.Tests` | xUnit v3 tests for the API | |

## Prerequisites

Install these once (Windows):

- **.NET 10 SDK**: https://dotnet.microsoft.com/download/dotnet/10.0 (or `winget install Microsoft.DotNet.SDK.10`)
- **Node.js 24 LTS** (24.15 or newer): https://nodejs.org (or `winget install OpenJS.NodeJS.LTS`)
- **SQL Server Express LocalDB**: it comes with Visual Studio's "ASP.NET and web development" workload.
  Without Visual Studio, download the SQL Server Express installer from
  https://www.microsoft.com/sql-server/sql-server-downloads, run it, choose **Download Media**,
  pick **LocalDB**, and then run the `SqlLocalDB.msi` it downloads.

Photo storage needs no account or key. The sample members' photos load from randomuser.me,
so you need an internet connection to see them.

## Run it locally

Use two terminals: one for the API, one for the Angular app.

### 1. Start the API

```bash
cd DatingApp.api
dotnet run
```

The first start creates the `datingapp` database in LocalDB and adds 10 sample members.
The API is ready when it prints `Now listening on: http://localhost:5000`.

### 2. Start the Angular app

```bash
cd DatingApp-SPA
npm install                  # first time only
npm start
```

Open http://localhost:4200.

### 3. Log in

Log in as any sample member with the password `password`. Usernames are lower case:

- Women: `ines`, `greta`, `hazel`, `kelley`, `chasity`
- Men: `ryan`, `garcia`, `hobbs`, `french`, `may`

You can also register a new member from the home page.

Uploaded photos are saved in `DatingApp.api/Photos` and served from http://localhost:5000/photos/.

## Run the tests

API tests (with a code coverage report and an 80% minimum). They use an in-memory SQLite database,
so LocalDB does not need to be running:

```bash
cd DatingApp.api.Tests
dotnet test --coverlet
```

Angular tests:

```bash
cd DatingApp-SPA
npm run test:ci              # run once, with a code coverage report and an 80% minimum
npm test                     # or: re-run the tests whenever a file changes
```

## Serve the app from the API

As in the course, the API can serve the built Angular app itself:

```bash
cd DatingApp-SPA
npm run build -- --configuration production    # writes the build to DatingApp.api/wwwroot
cd ../DatingApp.api
dotnet run
```

Open http://localhost:5000.

## Good to know

- `dotnet run` uses the course's launch profile, which runs the API in the `Production` environment.
- The JWT signing key in `DatingApp.api/appsettings.json` is for local development only.
  Replace it (with at least 64 characters) and the connection string before deploying anywhere.
- The API logs a warning that no AutoMapper license key is set. AutoMapper allows that for development
  and testing; running it in production needs a license from https://luckypennysoftware.com.
- To use SQL Server on macOS or Linux (for example in Docker), change `ConnectionStrings:DefaultConnection`
  in `DatingApp.api/appsettings.json`.

## What changed in the 2026 upgrade

The app's code is left as it was at the end of the course, apart from what was needed to run it on
current versions:

- The API moved from .NET Core 3.1 to .NET 10, and AutoMapper from 9 to 16.
- The Angular app moved from Angular 9 to 22, one major version at a time.
- Photos are stored on the API's disk instead of in Cloudinary, so no account or key is needed.
- Photo upload works. It never did in the original: the upload request was never sent.
- Unit tests for the API and the Angular app, each with at least 80% code coverage.

These quirks from the original code are kept as they were:

- The Messages page uses the number of messages in the first list it shows (Unread) as its page size.
  When there are no unread messages, the Inbox and Outbox lists stay empty too.
  (In 2020 this also showed a server error. Now the list is just empty.)
- The browser console shows "No value accessor" errors for the toggle buttons on the Matches, Lists
  and Messages pages. The buttons work.
