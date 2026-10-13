using DatingApp.api.Data;
using DatingApp.api.Helpers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DatingApp.api.Tests;

/// <summary>The init migration, the seed data and the age calculation.</summary>
public class DataTests
{
    // The app runs on SQL Server. EF can compare the model with the migrations and generate the
    // migration SQL for SQL Server without connecting to a database.
    private static DataContext SqlServerContext() => new(new DbContextOptionsBuilder<DataContext>()
        .UseLazyLoadingProxies()
        .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=not-used")
        .Options);

    [Fact]
    public void Migrations_MatchTheModel()
    {
        using var context = SqlServerContext();

        Assert.False(context.Database.HasPendingModelChanges());
        Assert.Equal(new[] { "20200427182100_init" }, context.Database.GetMigrations());
    }

    [Fact]
    public void InitMigration_CreatesTheTablesOnSqlServer()
    {
        using var context = SqlServerContext();

        var script = context.GetService<IMigrator>().GenerateScript();

        foreach (var table in new[] { "Users", "Values", "Likes", "Messages", "Photos" })
            Assert.Contains($"CREATE TABLE [{table}]", script);
        Assert.Contains("[ID] int NOT NULL IDENTITY", script);
        Assert.Contains("CONSTRAINT [FK_Likes_Users_LikeeId] FOREIGN KEY ([LikeeId]) REFERENCES [Users] ([ID]) ON DELETE NO ACTION", script);
    }

    [Fact]
    public void InitMigration_CanBeReverted()
    {
        using var context = SqlServerContext();

        var script = context.GetService<IMigrator>().GenerateScript(fromMigration: "20200427182100_init", toMigration: Migration.InitialDatabase);

        foreach (var table in new[] { "Users", "Values", "Likes", "Messages", "Photos" })
            Assert.Contains($"DROP TABLE [{table}]", script);
    }

    [Fact]
    public async Task Seed_AddsTheTenUsersOnce_WithPasswordPassword()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        using var context = new DataContext(new DbContextOptionsBuilder<DataContext>()
            .UseLazyLoadingProxies()
            .UseSqlite(connection)
            .Options);
        context.Database.EnsureCreated();

        Seed.SeedUsers(context);
        Seed.SeedUsers(context);

        Assert.Equal(10, context.Users.Count());
        Assert.Equal(10, context.Photos.Count(p => p.IsMain));
        Assert.All(context.Users, u => Assert.Equal(u.Username.ToLowerInvariant(), u.Username));
        Assert.NotNull(await new AuthRepository(context).Login("ines", "password"));
        Assert.Null(await new AuthRepository(context).Login("ines", "wrong"));
    }

    [Theory]
    [InlineData(-30, 0, 30)]   // birthday today
    [InlineData(-30, 1, 29)]   // birthday tomorrow
    [InlineData(-30, -1, 30)]  // birthday yesterday
    public void CalculateAge_CountsOnlyBirthdaysThatHavePassed(int years, int days, int expected)
    {
        var dateOfBirth = DateTime.Today.AddYears(years).AddDays(days);

        Assert.Equal(expected, dateOfBirth.CalculateAge());
    }
}
