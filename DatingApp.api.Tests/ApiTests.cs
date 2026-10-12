using System.Net;
using System.Text;
using System.Text.Json;
using DatingApp.api.Data;
using DatingApp.api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DatingApp.api.Tests;

/// <summary>
/// Runs the real API (Program, Startup and migrations) in memory against a private in-memory SQLite database.
/// </summary>
public class ApiFactory : WebApplicationFactory<Startup>
{
    private readonly string _connectionString = $"Data Source=file:{Guid.NewGuid()};Mode=Memory;Cache=Shared";
    private readonly SqliteConnection _keepAlive;

    protected virtual string EnvironmentName => Environments.Development;

    protected virtual bool CreateDatabase => true;

    public ApiFactory()
    {
        // An in-memory SQLite database only lives while a connection to it is open.
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(EnvironmentName);
        builder.ConfigureAppConfiguration(config => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = _connectionString
        }));
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        if (CreateDatabase)
        {
            using var scope = host.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<DataContext>();
            context.Database.Migrate();
            context.Values.AddRange(new Value { Name = "Value 101" }, new Value { Name = "Value 102" });
            context.SaveChanges();
        }

        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _keepAlive.Dispose();
        }
    }
}

public class ApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    public ApiTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetValues_ReturnsAllValuesAsJson()
    {
        var response = await _client.GetAsync("/api/values", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(
            """[{"id":1,"name":"Value 101"},{"id":2,"name":"Value 102"}]""",
            await response.Content.ReadAsStringAsync(Token));
    }

    [Fact]
    public async Task GetValue_ReturnsTheMatchingValue()
    {
        var response = await _client.GetAsync("/api/values/2", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("""{"id":2,"name":"Value 102"}""", await response.Content.ReadAsStringAsync(Token));
    }

    [Fact]
    public async Task GetValue_ReturnsNoContent_WhenIdDoesNotExist()
    {
        var response = await _client.GetAsync("/api/values/99", Token);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task GetValues_AllowsAnyOrigin()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/values");
        request.Headers.Add("Origin", "http://localhost:4200");

        var response = await _client.SendAsync(request, Token);

        Assert.Equal("*", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    [Fact]
    public async Task CorsPreflight_AllowsAnyOriginMethodAndHeader()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/values");
        request.Headers.Add("Origin", "http://localhost:4200");
        request.Headers.Add("Access-Control-Request-Method", "PUT");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");

        var response = await _client.SendAsync(request, Token);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("*", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.Contains("PUT", response.Headers.GetValues("Access-Control-Allow-Methods"));
        Assert.Contains("content-type", response.Headers.GetValues("Access-Control-Allow-Headers"));
    }

    [Theory]
    [InlineData("POST", "/api/values")]
    [InlineData("PUT", "/api/values/1")]
    [InlineData("DELETE", "/api/values/1")]
    public async Task WriteEndpoints_ReturnOk(string method, string url)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), url)
        {
            Content = method == "DELETE" ? null : new StringContent("\"some value\"", Encoding.UTF8, "application/json")
        };

        var response = await _client.SendAsync(request, Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetWeatherForecast_ReturnsFiveForecasts()
    {
        var response = await _client.GetAsync("/weatherforecast", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(Token);
        Assert.Equal(5, JsonDocument.Parse(json).RootElement.GetArrayLength());
    }
}

public class ProductionApiFactory : ApiFactory
{
    protected override string EnvironmentName => Environments.Production;
}

public class ApiWithoutDatabaseFactory : ApiFactory
{
    protected override bool CreateDatabase => false;
}

public class ProductionApiTests : IClassFixture<ProductionApiFactory>
{
    private readonly HttpClient _client;

    public ProductionApiTests(ProductionApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetValues_ReturnsAllValuesAsJson()
    {
        var response = await _client.GetAsync("/api/values", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            """[{"id":1,"name":"Value 101"},{"id":2,"name":"Value 102"}]""",
            await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }
}

public class DevelopmentErrorTests : IClassFixture<ApiWithoutDatabaseFactory>
{
    private readonly HttpClient _client;

    public DevelopmentErrorTests(ApiWithoutDatabaseFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task UnhandledError_ShowsTheDeveloperExceptionPage()
    {
        var response = await _client.GetAsync("/api/values", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Contains("no such table: Values", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }
}
