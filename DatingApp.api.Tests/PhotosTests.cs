using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DatingApp.api.Models;
using DatingApp.api.Tests.Infrastructure;
using SkiaSharp;

namespace DatingApp.api.Tests;

public class PhotosTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static async Task<HttpResponseMessage> Upload(HttpClient client, int userId, byte[] content, string fileName = "photo.png", string contentType = "image/png")
    {
        var file = new ByteArrayContent(content);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        var form = new MultipartFormDataContent { { file, "file", fileName } };
        return await client.PostAsync($"/api/users/{userId}/photos", form, Ct);
    }

    private static byte[] Png() => TestImages.Quadrants(640, 480, SKEncodedImageFormat.Png);

    [Fact]
    public async Task Upload_StoresA500x500Photo_ServedFromTheApi()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var response = await Upload(client, api.UserId("ines"), Png());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var photo = await response.Content.ReadFromJsonAsync<PhotoDto>(Ct);
        Assert.Matches(@"^http://localhost/photos/[0-9a-f]{32}\.png$", photo!.Url);
        Assert.False(photo.IsMain);
        Assert.True(File.Exists(Path.Combine(api.PhotoFolder, "Photos", photo.PublicId + ".png")));
        Assert.EndsWith($"/api/users/{api.UserId("ines")}/photos/{photo.Id}", response.Headers.Location!.ToString(), StringComparison.OrdinalIgnoreCase);

        var served = await client.GetAsync(new Uri(photo.Url).AbsolutePath, Ct);
        Assert.Equal(HttpStatusCode.OK, served.StatusCode);
        Assert.Equal("image/png", served.Content.Headers.ContentType!.MediaType);
        using var image = SKBitmap.Decode(await served.Content.ReadAsByteArrayAsync(Ct));
        Assert.Equal((500, 500), (image.Width, image.Height));
    }

    [Fact]
    public async Task Upload_MakesTheFirstPhotoTheMainPhoto()
    {
        using var api = new ApiFactory();
        var anonymous = api.CreateClient();
        await anonymous.PostAsJsonAsync("/api/auth/register", new { username = "newbie", password = "password", gender = "male", knownAs = "Newbie", city = "Rome", country = "Italy", dateofBirth = new DateTime(1990, 1, 1) }, Ct);
        var client = await api.LoginAsync("newbie");

        var response = await Upload(client, api.UserId("newbie"), Png());

        var photo = await response.Content.ReadFromJsonAsync<PhotoDto>(Ct);
        Assert.True(photo!.IsMain);
    }

    [Fact]
    public async Task Upload_ReturnsUnauthorized_ForAnotherUser()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var response = await Upload(client, api.UserId("ryan"), Png());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Upload_Fails_ForAFileThatIsNotAnImage()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");

        var response = await Upload(client, api.UserId("ines"), "not an image"u8.ToArray(), "notes.txt", "text/plain");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(1, api.WithDb(db => db.Photos.Count(p => p.UserId == api.UserId("ines"))));
    }

    [Fact]
    public async Task GetPhoto_ReturnsThePhoto()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var id = api.WithDb(db => db.Photos.Single(p => p.UserId == api.UserId("ryan")).Id);

        var photo = await client.GetFromJsonAsync<PhotoDto>($"/api/users/{api.UserId("ines")}/photos/{id}", Ct);

        Assert.Equal(id, photo!.Id);
        Assert.Contains("randomuser.me", photo.Url);
    }

    [Fact]
    public async Task SetMainPhoto_MovesTheMainFlag()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var userId = api.UserId("ines");
        var uploaded = await (await Upload(client, userId, Png())).Content.ReadFromJsonAsync<PhotoDto>(Ct);

        var response = await client.PostAsync($"/api/users/{userId}/photos/{uploaded!.Id}/setMain", null, Ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var photos = api.WithDb(db => db.Photos.Where(p => p.UserId == userId).ToList());
        Assert.Equal(uploaded.Id, Assert.Single(photos, p => p.IsMain).Id);
    }

    [Fact]
    public async Task SetMainPhoto_ReturnsBadRequest_ForTheCurrentMainPhoto()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var userId = api.UserId("ines");
        var mainId = api.WithDb(db => db.Photos.Single(p => p.UserId == userId).Id);

        var response = await client.PostAsync($"/api/users/{userId}/photos/{mainId}/setMain", null, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("This is already the main photo", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task SetMainPhoto_ReturnsUnauthorized_ForSomeoneElsesPhotoOrAccount()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var ryansPhoto = api.WithDb(db => db.Photos.Single(p => p.UserId == api.UserId("ryan")).Id);

        var notOwned = await client.PostAsync($"/api/users/{api.UserId("ines")}/photos/{ryansPhoto}/setMain", null, Ct);
        var otherAccount = await client.PostAsync($"/api/users/{api.UserId("ryan")}/photos/{ryansPhoto}/setMain", null, Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, notOwned.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, otherAccount.StatusCode);
    }

    [Fact]
    public async Task DeletePhoto_RemovesAnUploadedPhotoAndItsFile()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var userId = api.UserId("ines");
        var uploaded = await (await Upload(client, userId, Png())).Content.ReadFromJsonAsync<PhotoDto>(Ct);
        var file = Path.Combine(api.PhotoFolder, "Photos", uploaded!.PublicId + ".png");

        var response = await client.DeleteAsync($"/api/users/{userId}/photos/{uploaded.Id}", Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(File.Exists(file));
        Assert.Equal(1, api.WithDb(db => db.Photos.Count(p => p.UserId == userId)));
    }

    [Fact]
    public async Task DeletePhoto_RemovesASeededPhotoWithoutAFile()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var userId = api.UserId("ines");
        var seeded = api.WithDb(db => db.Photos.Single(p => p.UserId == userId).Id);
        var uploaded = await (await Upload(client, userId, Png())).Content.ReadFromJsonAsync<PhotoDto>(Ct);
        await client.PostAsync($"/api/users/{userId}/photos/{uploaded!.Id}/setMain", null, Ct);

        var response = await client.DeleteAsync($"/api/users/{userId}/photos/{seeded}", Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(uploaded.Id, api.WithDb(db => db.Photos.Single(p => p.UserId == userId).Id));
    }

    [Fact]
    public async Task DeletePhoto_ReturnsBadRequest_ForTheMainPhoto()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var userId = api.UserId("ines");
        var mainId = api.WithDb(db => db.Photos.Single(p => p.UserId == userId).Id);

        var response = await client.DeleteAsync($"/api/users/{userId}/photos/{mainId}", Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("You cannot delete your main photo", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task DeletePhoto_ReturnsUnauthorized_ForSomeoneElsesPhotoOrAccount()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var ryansPhoto = api.WithDb(db => db.Photos.Single(p => p.UserId == api.UserId("ryan")).Id);

        var notOwned = await client.DeleteAsync($"/api/users/{api.UserId("ines")}/photos/{ryansPhoto}", Ct);
        var otherAccount = await client.DeleteAsync($"/api/users/{api.UserId("ryan")}/photos/{ryansPhoto}", Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, notOwned.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, otherAccount.StatusCode);
    }

    [Fact]
    public async Task DeletePhoto_KeepsTheRow_WhenItsFileIsAlreadyGone()
    {
        using var api = new ApiFactory();
        var client = await api.LoginAsync("ines");
        var userId = api.UserId("ines");
        var photoId = api.WithDb(db =>
        {
            var photo = new Photo { Url = "http://localhost/photos/missing.jpg", PublicId = "missing", UserId = userId, Added = DateTime.Now };
            db.Photos.Add(photo);
            db.SaveChanges();
            return photo.Id;
        });

        var response = await client.DeleteAsync($"/api/users/{userId}/photos/{photoId}", Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Failed to delete the photo", await response.Content.ReadAsStringAsync(Ct));
        Assert.True(api.WithDb(db => db.Photos.Any(p => p.Id == photoId)));
    }

    private record PhotoDto(int Id, string Url, bool IsMain, string PublicId);
}
