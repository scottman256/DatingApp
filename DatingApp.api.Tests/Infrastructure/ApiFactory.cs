using System.Net.Http.Headers;
using System.Net.Http.Json;
using DatingApp.api;
using DatingApp.api.Data;
using DatingApp.api.Helpers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace DatingApp.api.Tests.Infrastructure;

/// <summary>
/// Runs the real API (Program, Startup and the seed data) in memory.
/// SQL Server is swapped for a private in-memory SQLite database and photos go to a temporary folder,
/// so every factory starts from the 10 seeded users and nothing touches the developer's machine.
/// </summary>
public class ApiFactory : WebApplicationFactory<Startup>
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly string _environment;

    public string PhotoFolder { get; } = Path.Combine(Path.GetTempPath(), "datingapp-tests", Guid.NewGuid().ToString("N"));

    public ApiFactory() : this(Environments.Development) { }

    protected ApiFactory(string environment)
    {
        _environment = environment;
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_environment);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<DataContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<DataContext>>();
            services.AddDbContext<DataContext>(x => x
                .UseLazyLoadingProxies()
                .UseSqlite(_connection));

            services.RemoveAll<PhotoStorage>();
            services.AddSingleton(new PhotoStorage(new TestEnvironment(PhotoFolder)));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<DataContext>();
        // The init migration targets SQL Server, so the SQLite schema is created from the model.
        context.Database.EnsureCreated();
        Seed.SeedUsers(context);
        return host;
    }

    public T WithDb<T>(Func<DataContext, T> query)
    {
        using var scope = Services.CreateScope();
        return query(scope.ServiceProvider.GetRequiredService<DataContext>());
    }

    public int UserId(string username) => WithDb(db => db.Users.Single(u => u.Username == username).ID);

    /// <summary>Logs in a seeded user (password "password") and returns a client that sends the token.</summary>
    public async Task<HttpClient> LoginAsync(string username, string password = "password")
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { username, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.Token);
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
            if (Directory.Exists(PhotoFolder))
                Directory.Delete(PhotoFolder, recursive: true);
        }
    }

    public record LoginResponse(string Token, LoginUser User);

    public record LoginUser(int Id, string Username, string KnownAs, string Gender, string PhotoUrl);
}

/// <summary>The same API running in the Production environment (as the launch profile does).</summary>
public class ProductionApiFactory : ApiFactory
{
    public ProductionApiFactory() : base(Environments.Production) { }
}

/// <summary>Minimal IWebHostEnvironment so PhotoStorage can be pointed at a temporary folder.</summary>
public class TestEnvironment : IWebHostEnvironment
{
    public TestEnvironment(string contentRoot)
    {
        ContentRootPath = contentRoot;
        Directory.CreateDirectory(contentRoot);
    }

    public string ApplicationName { get; set; } = "DatingApp.api";
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    public string ContentRootPath { get; set; }
    public string EnvironmentName { get; set; } = Environments.Development;
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string WebRootPath { get; set; } = "";
}
