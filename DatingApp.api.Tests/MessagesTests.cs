using System.Net;
using System.Net.Http.Json;
using DatingApp.api.Tests.Infrastructure;

namespace DatingApp.api.Tests;

public class MessagesTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static async Task<MessageDto> Send(ApiFactory api, HttpClient sender, string from, string to, string content)
    {
        var response = await sender.PostAsJsonAsync($"/api/users/{api.UserId(from)}/messages", new { recipientId = api.UserId(to), content }, Ct);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<MessageDto>(Ct))!;
    }

    private static Task<List<MessageDto>?> Container(HttpClient client, int userId, string container) =>
        client.GetFromJsonAsync<List<MessageDto>>($"/api/users/{userId}/messages?messageContainer={container}", Ct);

    [Fact]
    public async Task CreateMessage_ReturnsTheMessageWithBothUsers()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");

        var message = await Send(api, ines, "ines", "ryan", "Hello Ryan");

        Assert.Equal("Hello Ryan", message.Content);
        Assert.Equal("Ines", message.SenderKnownAs);
        Assert.Equal("Ryan", message.RecipientKnownAs);
        Assert.Contains("randomuser.me", message.SenderPhotoUrl);
        Assert.Contains("randomuser.me", message.RecipientPhotoUrl);
        Assert.False(message.IsRead);
    }

    [Fact]
    public async Task CreateMessage_ReturnsBadRequest_ForAnUnknownRecipient()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");

        var response = await ines.PostAsJsonAsync($"/api/users/{api.UserId("ines")}/messages", new { recipientId = 999, content = "Hi" }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Could not find user", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task CreateMessage_ReturnsUnauthorized_OnBehalfOfAnotherUser()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");

        var response = await ines.PostAsJsonAsync($"/api/users/{api.UserId("ryan")}/messages", new { recipientId = api.UserId("ines"), content = "Hi" }, Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMessage_ReturnsTheMessage_OrNotFound()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");
        var sent = await Send(api, ines, "ines", "ryan", "Hello Ryan");

        var found = await ines.GetAsync($"/api/users/{api.UserId("ines")}/messages/{sent.Id}", Ct);
        var missing = await ines.GetAsync($"/api/users/{api.UserId("ines")}/messages/999", Ct);
        var otherAccount = await ines.GetAsync($"/api/users/{api.UserId("ryan")}/messages/{sent.Id}", Ct);

        Assert.Equal(HttpStatusCode.OK, found.StatusCode);
        Assert.Contains("Hello Ryan", await found.Content.ReadAsStringAsync(Ct));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, otherAccount.StatusCode);
    }

    [Fact]
    public async Task GetMessagesForUser_ReturnsTheUnreadInboxAndOutboxMessages()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");
        var ryan = await api.LoginAsync("ryan");
        await Send(api, ines, "ines", "ryan", "First");
        await Send(api, ines, "ines", "ryan", "Second");
        await Send(api, ryan, "ryan", "ines", "Reply");

        var ryanUnread = await Container(ryan, api.UserId("ryan"), "Unread");
        var ryanInbox = await Container(ryan, api.UserId("ryan"), "Inbox");
        var ryanOutbox = await Container(ryan, api.UserId("ryan"), "Outbox");

        Assert.Equal(new[] { "Second", "First" }, ryanUnread!.Select(m => m.Content));
        Assert.Equal(new[] { "Second", "First" }, ryanInbox!.Select(m => m.Content));
        Assert.Equal("Reply", Assert.Single(ryanOutbox!).Content);
    }

    [Fact]
    public async Task GetMessagesForUser_SendsAPaginationHeader_AndRequiresTheOwner()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");

        var own = await ines.GetAsync($"/api/users/{api.UserId("ines")}/messages", Ct);
        var other = await ines.GetAsync($"/api/users/{api.UserId("ryan")}/messages", Ct);

        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.True(own.Headers.Contains("Pagination"));
        Assert.Equal(HttpStatusCode.Unauthorized, other.StatusCode);
    }

    [Fact]
    public async Task GetMessageThread_ReturnsTheConversationNewestFirst()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");
        var ryan = await api.LoginAsync("ryan");
        await Send(api, ines, "ines", "ryan", "Hi");
        await Send(api, ryan, "ryan", "ines", "Hello back");
        await Send(api, ines, "ines", "hobbs", "Someone else");

        var thread = await ines.GetFromJsonAsync<List<MessageDto>>($"/api/users/{api.UserId("ines")}/messages/thread/{api.UserId("ryan")}", Ct);
        var other = await ines.GetAsync($"/api/users/{api.UserId("ryan")}/messages/thread/{api.UserId("ines")}", Ct);

        Assert.Equal(new[] { "Hello back", "Hi" }, thread!.Select(m => m.Content));
        Assert.Equal(HttpStatusCode.Unauthorized, other.StatusCode);
    }

    [Fact]
    public async Task MarkMessageAsRead_OnlyWorksForTheRecipient()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");
        var ryan = await api.LoginAsync("ryan");
        var sent = await Send(api, ines, "ines", "ryan", "Hi");

        var bySender = await ines.PostAsync($"/api/users/{api.UserId("ines")}/messages/{sent.Id}/read", null, Ct);
        var otherAccount = await ines.PostAsync($"/api/users/{api.UserId("ryan")}/messages/{sent.Id}/read", null, Ct);
        var byRecipient = await ryan.PostAsync($"/api/users/{api.UserId("ryan")}/messages/{sent.Id}/read", null, Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, bySender.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, otherAccount.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, byRecipient.StatusCode);
        Assert.Empty((await Container(ryan, api.UserId("ryan"), "Unread"))!);
        Assert.True(api.WithDb(db => db.Messages.Single(m => m.Id == sent.Id).DateRead.HasValue));
    }

    [Fact]
    public async Task DeleteMessage_HidesItPerUser_AndRemovesItWhenBothDelete()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");
        var ryan = await api.LoginAsync("ryan");
        var sent = await Send(api, ines, "ines", "ryan", "Hi");

        var bySender = await ines.PostAsync($"/api/users/{api.UserId("ines")}/messages/{sent.Id}", null, Ct);
        Assert.Equal(HttpStatusCode.NoContent, bySender.StatusCode);
        Assert.Empty((await Container(ines, api.UserId("ines"), "Outbox"))!);
        Assert.Single((await Container(ryan, api.UserId("ryan"), "Inbox"))!);

        var byRecipient = await ryan.PostAsync($"/api/users/{api.UserId("ryan")}/messages/{sent.Id}", null, Ct);
        Assert.Equal(HttpStatusCode.NoContent, byRecipient.StatusCode);
        Assert.False(api.WithDb(db => db.Messages.Any(m => m.Id == sent.Id)));
    }

    [Fact]
    public async Task DeleteMessage_ReturnsUnauthorized_OnBehalfOfAnotherUser()
    {
        using var api = new ApiFactory();
        var ines = await api.LoginAsync("ines");
        var sent = await Send(api, ines, "ines", "ryan", "Hi");

        var response = await ines.PostAsync($"/api/users/{api.UserId("ryan")}/messages/{sent.Id}", null, Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private record MessageDto(int Id, int SenderId, string SenderKnownAs, string SenderPhotoUrl, int RecipientId, string RecipientKnownAs, string RecipientPhotoUrl, string Content, bool IsRead, DateTime? DateRead, DateTime MessageSent);
}
