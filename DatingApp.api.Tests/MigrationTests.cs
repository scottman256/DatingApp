using DatingApp.api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DatingApp.api.Tests;

public class MigrationTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DataContext _context;

    public MigrationTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        _context = new DataContext(new DbContextOptionsBuilder<DataContext>().UseSqlite(_connection).Options);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private bool ValuesTableExists()
    {
        using var command = _connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'Values'";
        return (long)command.ExecuteScalar()! == 1;
    }

    [Fact]
    public void Model_HasNoChangesMissingFromMigrations()
    {
        Assert.False(_context.Database.HasPendingModelChanges());
    }

    [Fact]
    public void InitialCreate_CreatesAndDropsTheValuesTable()
    {
        var migrator = _context.GetService<IMigrator>();

        migrator.Migrate("InitialCreate");
        Assert.True(ValuesTableExists());

        migrator.Migrate(Migration.InitialDatabase);
        Assert.False(ValuesTableExists());
    }
}
