using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DatingApp.api.Tests.Infrastructure;

namespace DatingApp.api.Tests;

public class UsersTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static async Task<(List<UserSummary> Users, JsonElement Pagination)> GetUsers(HttpClient client, string query = "")
    {
        var response = await client.GetAsync("/api/users" + query, Ct);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<UserSummary>>(Ct);
        var pagination = JsonDocument.Parse(response.Headers.GetValues("Pagination").Single()).RootElement;
        return (users!, pagination);
    }

    [Fact]
    public async Task GetUsers_RequiresAToken()
    {
        using var api = new ApiFactory();

        var response = await api.CreateClient().GetAsync("/api/users", Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_ReturnsTheOppositeGender_WithAPaginationHeader()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var (users, pagination) = await GetUsers(client);

        Assert.Equal(5, users.Count);
        Assert.All(users, u => Assert.Equal("male", u.Gender));
        Assert.Equal(1, pagination.GetProperty("currentPage").GetInt32());
        Assert.Equal(10, pagination.GetProperty("itemsPerPage").GetInt32());
        Assert.Equal(5, pagination.GetProperty("totalItems").GetInt32());
        Assert.Equal(1, pagination.GetProperty("totalPages").GetInt32());
    }

    [Fact]
    public async Task GetUsers_ForAMale_ReturnsFemales()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ryan");

        var (users, _) = await GetUsers(client);

        Assert.Equal(5, users.Count);
        Assert.All(users, u => Assert.Equal("female", u.Gender));
    }

    [Fact]
    public async Task GetUsers_FiltersByGender_ExcludingTheCurrentUser()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var (users, _) = await GetUsers(client, "?gender=female");

        Assert.Equal(4, users.Count);
        Assert.DoesNotContain(users, u => u.KnownAs == "Ines");
    }

    [Fact]
    public async Task GetUsers_FiltersByAge()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var (users, _) = await GetUsers(client, "?minAge=18&maxAge=40");

        Assert.NotEmpty(users);
        Assert.All(users, u => Assert.InRange(u.Age, 18, 40));
        Assert.True(users.Count < 5);
    }

    [Fact]
    public async Task GetUsers_OrdersByLastActiveOrByCreated()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var (byCreated, _) = await GetUsers(client, "?orderBy=created");
        var (byLastActive, _) = await GetUsers(client, "?orderBy=lastActive");

        Assert.Equal(byCreated.OrderByDescending(u => u.Created).Select(u => u.Id), byCreated.Select(u => u.Id));
        Assert.Equal(byLastActive.OrderByDescending(u => u.LastActive).Select(u => u.Id), byLastActive.Select(u => u.Id));
    }

    [Fact]
    public async Task GetUsers_ReturnsTheRequestedPage()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var (users, pagination) = await GetUsers(client, "?pageNumber=2&pageSize=2");

        Assert.Equal(2, users.Count);
        Assert.Equal(2, pagination.GetProperty("currentPage").GetInt32());
        Assert.Equal(3, pagination.GetProperty("totalPages").GetInt32());
    }

    [Fact]
    public async Task GetUsers_CapsThePageSizeAt50()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var (_, pagination) = await GetUsers(client, "?pageSize=100");

        Assert.Equal(50, pagination.GetProperty("itemsPerPage").GetInt32());
    }

    [Fact]
    public async Task GetUsers_ListsLikersAndLikees()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");
        var ryan = await api.LoginAsync("ryan");
        await ines.PostAsync($"/api/users/{api.UserId("ines")}/like/{api.UserId("ryan")}", null, Ct);

        var (inesLikees, _) = await GetUsers(ines, "?likees=true");
        var (ryanLikers, _) = await GetUsers(ryan, "?likers=true");
        var (inesLikers, _) = await GetUsers(ines, "?likers=true");

        Assert.Equal("Ryan", Assert.Single(inesLikees).KnownAs);
        Assert.Equal("Ines", Assert.Single(ryanLikers).KnownAs);
        Assert.Empty(inesLikers);
    }

    [Fact]
    public async Task GetUser_ReturnsTheProfileWithPhotos()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var user = await client.GetFromJsonAsync<UserDetails>($"/api/users/{api.UserId("ryan")}", Ct);

        Assert.Equal("Ryan", user!.KnownAs);
        Assert.Equal("Lupton", user.City);
        Assert.Contains("randomuser.me", user.PhotoUrl);
        Assert.True(Assert.Single(user.Photos).IsMain);
        Assert.InRange(user.Age, 18, 99);
    }

    [Fact]
    public async Task UpdateUser_SavesTheProfile()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var id = api.UserId("ines");

        var response = await client.PutAsJsonAsync($"/api/users/{id}", new { introduction = "Hello", interests = "Hiking", city = "Paris", country = "France", lookingFor = "Someone" }, Ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var user = await client.GetFromJsonAsync<UserDetails>($"/api/users/{id}", Ct);
        Assert.Equal("Hello", user!.Introduction);
        Assert.Equal("Paris", user.City);
    }

    [Fact]
    public async Task UpdateUser_ReturnsUnauthorized_ForAnotherUsersProfile()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var response = await client.PutAsJsonAsync($"/api/users/{api.UserId("ryan")}", new { introduction = "Hacked" }, Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_Fails_WhenNothingChanged()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var id = api.UserId("ines");
        var current = await client.GetFromJsonAsync<UserDetails>($"/api/users/{id}", Ct);

        var response = await client.PutAsJsonAsync($"/api/users/{id}", new { current!.Introduction, current.Interests, current.City, current.LookingFor, current.Country }, Ct);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Contains($"Updating user {id} failed on save", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task LikeUser_AddsALike_Once()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var url = $"/api/users/{api.UserId("ines")}/like/{api.UserId("ryan")}";

        var first = await client.PostAsync(url, null, Ct);
        var second = await client.PostAsync(url, null, Ct);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        Assert.Equal("You already like this user", await second.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task LikeUser_ReturnsNotFound_ForAnUnknownUser()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var response = await client.PostAsync($"/api/users/{api.UserId("ines")}/like/999", null, Ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task LikeUser_ReturnsUnauthorized_OnBehalfOfAnotherUser()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var response = await client.PostAsync($"/api/users/{api.UserId("ryan")}/like/{api.UserId("ines")}", null, Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task EveryRequest_UpdatesTheUsersLastActiveTime()
    {
        using var api = new ApiFactory();
        var before = api.WithDb(db => db.Users.Single(u => u.Username == "ryan").LastActive);
        var client = await api.LoginAsync("ryan");

        await client.GetAsync("/api/users", Ct);

        var after = api.WithDb(db => db.Users.Single(u => u.Username == "ryan").LastActive);
        Assert.True(after > before);
        Assert.Equal(DateTime.Now.Date, after.Date);
    }

    private record UserSummary(int Id, string KnownAs, string Gender, int Age, DateTime Created, DateTime LastActive, string PhotoUrl);

    private record UserDetails(int Id, string KnownAs, int Age, string City, string Country, string Introduction, string Interests, string LookingFor, string PhotoUrl, List<PhotoDetails> Photos);

    private record PhotoDetails(int Id, string Url, bool IsMain);
}
