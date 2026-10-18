using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using DatingApp.api.Tests.Infrastructure;

namespace DatingApp.api.Tests;

public class AuthTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static object NewUser(string username = "Tester", string password = "password") => new
    {
        username,
        password,
        gender = "female",
        knownAs = "Tess",
        city = "Boston",
        country = "USA",
        dateofBirth = new DateTime(1990, 1, 15)
    };

    [Fact]
    public async Task Login_ReturnsTokenAndUser_ForSeededUser()
    {
        using var api = new ApiFactory();

        var response = await api.CreateClient().PostAsJsonAsync("/api/auth/login", new { username = "ines", password = "password" }, Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiFactory.LoginResponse>(Ct);
        Assert.Equal("Ines", body!.User.KnownAs);
        Assert.Contains("randomuser.me", body.User.PhotoUrl);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(body.Token);
        Assert.Equal(api.UserId("ines").ToString(), token.Claims.Single(c => c.Type == "nameid").Value);
        Assert.Equal("ines", token.Claims.Single(c => c.Type == "unique_name").Value);
        Assert.Equal("HS512", token.Header.Alg);
    }

    [Fact]
    public async Task Login_IgnoresTheCaseOfTheUsername()
    {
        using var api = new ApiFactory();

        var response = await api.CreateClient().PostAsJsonAsync("/api/auth/login", new { username = "INES", password = "password" }, Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("ines", "wrong")]
    [InlineData("nobody", "password")]
    public async Task Login_ReturnsUnauthorized_ForBadCredentials(string username, string password)
    {
        using var api = new ApiFactory();

        var response = await api.CreateClient().PostAsJsonAsync("/api/auth/login", new { username, password }, Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Register_CreatesTheUser_WithALowerCaseUsername()
    {
        using var api = new ApiFactory();
        var client = api.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", NewUser("Tester"), Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<UserDetails>(Ct);
        Assert.Equal("tester", created!.Username);
        Assert.Equal("Tess", created.KnownAs);
        Assert.EndsWith($"/api/Users/{created.Id}", response.Headers.Location!.ToString());

        var login = await client.PostAsJsonAsync("/api/auth/login", new { username = "tester", password = "password" }, Ct);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Register_ReturnsBadRequest_WhenTheUsernameIsTaken()
    {
        using var api = new ApiFactory();

        var response = await api.CreateClient().PostAsJsonAsync("/api/auth/register", NewUser("Ines"), Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Username already exists", await response.Content.ReadAsStringAsync(Ct));
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("123456789")]
    public async Task Register_RequiresAPasswordOf4To8Characters(string password)
    {
        using var api = new ApiFactory();

        var response = await api.CreateClient().PostAsJsonAsync("/api/auth/register", NewUser("Tester", password), Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("You must specify password between 4 and 8 characters", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task Register_RequiresTheProfileFields()
    {
        using var api = new ApiFactory();

        var response = await api.CreateClient().PostAsJsonAsync("/api/auth/register", new { username = "tester", password = "password" }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = await response.Content.ReadAsStringAsync(Ct);
        Assert.Contains("Gender", errors);
        Assert.Contains("City", errors);
    }

    private record UserDetails(int Id, string Username, string KnownAs);
}
