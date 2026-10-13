using System.Net;
using System.Net.Http.Json;
using DatingApp.api.Tests.Infrastructure;

namespace DatingApp.api.Tests;

/// <summary>Values, WeatherForecast, the SPA fallback, CORS and the Production error handler.</summary>
public class AppTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task GetValues_IsAnonymous()
    {
        using var api = new ApiFactory();
        var client = api.CreateClient();

        var all = await client.GetAsync("/api/values", Ct);
        var one = await client.GetAsync("/api/values/1", Ct);

        Assert.Equal(HttpStatusCode.OK, all.StatusCode);
        Assert.Equal("[]", await all.Content.ReadAsStringAsync(Ct));
        Assert.Equal(HttpStatusCode.NoContent, one.StatusCode);
    }

    [Fact]
    public async Task ValueWriteEndpoints_RequireAToken()
    {
        using var api = new ApiFactory();
        var anonymous = api.CreateClient();
        var client = await api.LoginAsync("ines");

        var rejected = await anonymous.PostAsJsonAsync("/api/values", "x", Ct);
        var post = await client.PostAsJsonAsync("/api/values", "x", Ct);
        var put = await client.PutAsJsonAsync("/api/values/1", "x", Ct);
        var delete = await client.DeleteAsync("/api/values/1", Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, rejected.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);
    }

    [Fact]
    public async Task GetWeatherForecast_ReturnsFiveDays()
    {
        using var api = new ApiFactory();

        var forecasts = await api.CreateClient().GetFromJsonAsync<List<Forecast>>("/weatherforecast", Ct);

        Assert.Equal(5, forecasts!.Count);
        Assert.All(forecasts, f => Assert.Equal(32 + (int)(f.TemperatureC / 0.5556), f.TemperatureF));
    }

    [Fact]
    public async Task Cors_AllowsAnyOrigin()
    {
        using var api = new ApiFactory();
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/users");
        request.Headers.Add("Origin", "http://localhost:4200");
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");

        var response = await api.CreateClient().SendAsync(request, Ct);

        Assert.Equal("*", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    [Fact]
    public async Task UnknownPaths_ServeTheAngularApp_FromWwwroot()
    {
        using var api = new ApiFactory();
        // Fallback serves wwwroot/index.html from the working directory (where `ng build` puts it).
        var index = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html");
        Directory.CreateDirectory(Path.GetDirectoryName(index)!);
        await File.WriteAllTextAsync(index, "<app-root></app-root>", Ct);

        var response = await api.CreateClient().GetAsync("/members/5", Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType!.MediaType, ignoreCase: true);
        Assert.Equal("<app-root></app-root>", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task Production_ServesTheApi()
    {
        using var api = new ProductionApiFactory();
        var client = await api.LoginAsync("ines");

        var response = await client.GetAsync("/api/users", Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Production_ReturnsErrorsAsAnApplicationErrorHeader()
    {
        using var api = new ProductionApiFactory();
        var client = await api.LoginAsync("ines");
        var id = api.UserId("ines");
        var current = await client.GetFromJsonAsync<Profile>($"/api/users/{id}", Ct);

        var response = await client.PutAsJsonAsync($"/api/users/{id}", current, Ct);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var message = $"Updating user {id} failed on save";
        Assert.Equal(message, Assert.Single(response.Headers.GetValues("Application-Error")));
        Assert.Contains("Application-Error", response.Headers.GetValues("Access-Control-Expose-Headers"));
        Assert.Equal(message, await response.Content.ReadAsStringAsync(Ct));
    }

    private record Forecast(DateTime Date, int TemperatureC, int TemperatureF, string Summary);

    private record Profile(string Introduction, string Interests, string City, string LookingFor, string Country);
}
