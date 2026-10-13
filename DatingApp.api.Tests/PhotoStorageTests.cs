using DatingApp.api.Helpers;
using DatingApp.api.Tests.Infrastructure;
using SkiaSharp;

namespace DatingApp.api.Tests;

public class PhotoStorageTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "datingapp-tests", Guid.NewGuid().ToString("N"));
    private readonly PhotoStorage _storage;

    public PhotoStorageTests()
    {
        _storage = new PhotoStorage(new TestEnvironment(_root));
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private byte[] Saved(PhotoUploadResult result) =>
        File.ReadAllBytes(Directory.GetFiles(_storage.Folder, result.PublicId + ".*").Single());

    [Fact]
    public void Upload_KeepsPngAsPng_AndReturnsItsUrl()
    {
        using var stream = new MemoryStream(TestImages.Quadrants(800, 400, SKEncodedImageFormat.Png));

        var result = _storage.Upload(stream, "http://localhost:5000");

        Assert.Equal($"http://localhost:5000/photos/{result.PublicId}.png", result.Uri.ToString());
        Assert.True(File.Exists(Path.Combine(_root, "Photos", result.PublicId + ".png")));
    }

    [Fact]
    public void Upload_SavesJpegAsJpeg()
    {
        using var stream = new MemoryStream(TestImages.Quadrants(400, 400, SKEncodedImageFormat.Jpeg));

        var result = _storage.Upload(stream, "http://localhost:5000");

        Assert.EndsWith(".jpg", result.Uri.ToString());
    }

    [Fact]
    public void Upload_ResizesToFill500x500_CroppingFromTheCentre()
    {
        // 800x400 becomes 1000x500 and the middle 500 pixels are kept: the left half of the
        // result shows the left quadrants and the right half the right quadrants.
        using var stream = new MemoryStream(TestImages.Quadrants(800, 400, SKEncodedImageFormat.Png));

        var saved = Saved(_storage.Upload(stream, "http://localhost"));

        using var image = SKBitmap.Decode(saved);
        Assert.Equal((500, 500), (image.Width, image.Height));
        Assert.Equal(TestImages.TopLeft, image.GetPixel(100, 100));
        Assert.Equal(TestImages.TopRight, image.GetPixel(400, 100));
        Assert.Equal(TestImages.BottomLeft, image.GetPixel(100, 400));
        Assert.Equal(TestImages.BottomRight, image.GetPixel(400, 400));
    }

    [Fact]
    public void Upload_EnlargesSmallPhotos()
    {
        using var stream = new MemoryStream(TestImages.Quadrants(100, 100, SKEncodedImageFormat.Png));

        using var image = SKBitmap.Decode(Saved(_storage.Upload(stream, "http://localhost")));

        Assert.Equal((500, 500), (image.Width, image.Height));
    }

    // For each EXIF orientation: the quadrant colors expected in the result's top-left,
    // top-right, bottom-left and bottom-right after the photo is turned upright.
    // The source is a square so cropping keeps the whole picture.
    public static TheoryData<int, string> Orientations => new()
    {
        { 1, "red,lime,blue,yellow" },   // normal
        { 2, "lime,red,yellow,blue" },   // mirrored left-right
        { 3, "yellow,blue,lime,red" },   // rotated 180
        { 4, "blue,yellow,red,lime" },   // mirrored top-bottom
        { 5, "red,blue,lime,yellow" },   // transposed
        { 6, "blue,red,yellow,lime" },   // rotated 90 clockwise
        { 7, "yellow,lime,blue,red" },   // transversed
        { 8, "lime,yellow,red,blue" },   // rotated 90 anticlockwise
    };

    [Theory]
    [MemberData(nameof(Orientations))]
    public void Upload_TurnsPhotosUpright_UsingTheirExifOrientation(int orientation, string expected)
    {
        var colors = new Dictionary<string, SKColor>
        {
            ["red"] = TestImages.TopLeft, ["lime"] = TestImages.TopRight,
            ["blue"] = TestImages.BottomLeft, ["yellow"] = TestImages.BottomRight
        };
        using var stream = new MemoryStream(TestImages.JpegWithOrientation(400, 400, orientation));

        var saved = Saved(_storage.Upload(stream, "http://localhost"));

        var points = new[] { (100, 100), (400, 100), (100, 400), (400, 400) };
        var names = expected.Split(',');
        for (var i = 0; i < points.Length; i++)
        {
            var actual = TestImages.PixelAt(saved, points[i].Item1, points[i].Item2);
            Assert.True(TestImages.IsClose(actual, colors[names[i]]),
                $"orientation {orientation}, point {points[i]}: expected {names[i]} but was {actual}");
        }
    }

    [Fact]
    public void Upload_ReturnsNoUrl_ForAFileThatIsNotAnImage()
    {
        using var stream = new MemoryStream("not an image"u8.ToArray());

        var result = _storage.Upload(stream, "http://localhost");

        Assert.Null(result.Uri);
        Assert.Null(result.PublicId);
        Assert.Empty(Directory.GetFiles(_storage.Folder));
    }

    [Fact]
    public void Destroy_DeletesThePhotoFile()
    {
        using var stream = new MemoryStream(TestImages.Quadrants(100, 100, SKEncodedImageFormat.Png));
        var uploaded = _storage.Upload(stream, "http://localhost");

        var result = _storage.Destroy(uploaded.PublicId);

        Assert.Equal("ok", result.Result);
        Assert.Empty(Directory.GetFiles(_storage.Folder));
    }

    [Fact]
    public void Destroy_ReportsNotFound_ForAnUnknownPhoto()
    {
        Assert.Equal("not found", _storage.Destroy("missing").Result);
    }
}
