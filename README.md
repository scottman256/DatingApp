# DatingApp

An ASP.NET Core Web API (`DatingApp.api`) and an Angular front end (`DatingApp-SPA`).
The Angular app shows the values stored in the API's SQLite database.

| Part | Tech | Runs on |
| --- | --- | --- |
| `DatingApp.api` | .NET 10, ASP.NET Core, EF Core 10 + SQLite | http://localhost:5000 |
| `DatingApp-SPA` | Angular 22 | http://localhost:4200 |

## Prerequisites

Install these once:

- **.NET 10 SDK**: https://dotnet.microsoft.com/download/dotnet/10.0 (or `winget install Microsoft.DotNet.SDK.10`)
- **Node.js 24 LTS** (24.15 or newer): https://nodejs.org (or `winget install OpenJS.NodeJS.LTS`)

## Run it locally

Use two terminals: one for the API, one for the Angular app.

### 1. Start the API

```bash
cd DatingApp.api
dotnet tool restore                  # first time only: installs the EF Core command-line tool
dotnet build DatingApp.api.csproj    # first time only: downloads packages and builds the API
dotnet ef database update            # first time only: creates the datingapp.db SQLite database
dotnet run
```

The API is ready when it prints `Now listening on: http://localhost:5000`.
Check it by opening http://localhost:5000/api/values. You should see `[]`.

### 2. Start the Angular app

```bash
cd DatingApp-SPA
npm install                  # first time only
npm start
```

Open http://localhost:4200. You should see the **Dating App** heading followed by the values from the API.

### 3. Add some values (optional)

The database starts empty. To add values, use the `sqlite3` command-line tool
(`winget install SQLite.SQLite`, then open a new terminal) from the `DatingApp.api` folder:

```bash
sqlite3 datingapp.db "INSERT INTO [Values] (Name) VALUES ('Value 101'), ('Value 102'), ('Value 103');"
```

Refresh http://localhost:4200 to see them. A GUI such as [DB Browser for SQLite](https://sqlitebrowser.org/) also works.

## Run the tests

API tests (with a code coverage report and an 80% minimum):

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

## Build the Angular app for production

```bash
cd DatingApp-SPA
npm run build -- --configuration production
```

The output is written to `DatingApp-SPA/dist/DatingApp-SPA`.
