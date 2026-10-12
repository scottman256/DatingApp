using DatingApp.api.Data;
using DatingApp.api.Models;
using DatingApp.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DatingApp.api.Tests;

public class ValuesControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DataContext _context;
    private readonly ValuesController _controller;

    public ValuesControllerTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        _context = new DataContext(new DbContextOptionsBuilder<DataContext>().UseSqlite(_connection).Options);
        _context.Database.Migrate();
        _controller = new ValuesController(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private void Seed(params string[] names)
    {
        _context.Values.AddRange(names.Select(name => new Value { Name = name }));
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetValues_ReturnsOkWithAllValues()
    {
        Seed("Value 101", "Value 102");

        var result = await _controller.GetValues();

        var ok = Assert.IsType<OkObjectResult>(result);
        var values = Assert.IsAssignableFrom<IEnumerable<Value>>(ok.Value);
        Assert.Equal(new[] { "Value 101", "Value 102" }, values.Select(v => v.Name));
    }

    [Fact]
    public async Task GetValues_ReturnsOkWithEmptyList_WhenThereAreNoValues()
    {
        var result = await _controller.GetValues();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Empty(Assert.IsAssignableFrom<IEnumerable<Value>>(ok.Value));
    }

    [Fact]
    public async Task GetValue_ReturnsOkWithMatchingValue()
    {
        Seed("Value 101", "Value 102");

        var result = await _controller.GetValue(2);

        var value = Assert.IsType<Value>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(2, value.Id);
        Assert.Equal("Value 102", value.Name);
    }

    [Fact]
    public async Task GetValue_ReturnsOkWithNull_WhenIdDoesNotExist()
    {
        Seed("Value 101");

        var result = await _controller.GetValue(99);

        Assert.Null(Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public void PostPutAndDelete_DoNotChangeStoredValues()
    {
        Seed("Value 101");

        _controller.Post("new value");
        _controller.Put(1, "updated value");
        _controller.Delete(1);

        var value = Assert.Single(_context.Values.AsNoTracking());
        Assert.Equal("Value 101", value.Name);
    }
}
