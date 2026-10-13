using SkiaSharp;

namespace DatingApp.api.Tests.Infrastructure;

/// <summary>Creates small test images whose four quadrants have different colors.</summary>
public static class TestImages
{
    public static readonly SKColor TopLeft = SKColors.Red;
    public static readonly SKColor TopRight = SKColors.Lime;
    public static readonly SKColor BottomLeft = SKColors.Blue;
    public static readonly SKColor BottomRight = SKColors.Yellow;

    public static byte[] Quadrants(int width, int height, SKEncodedImageFormat format)
    {
        using var bitmap = new SKBitmap(width, height);
        using (var canvas = new SKCanvas(bitmap))
        {
            using var paint = new SKPaint();
            void Fill(SKColor color, float x, float y)
            {
                paint.Color = color;
                canvas.DrawRect(SKRect.Create(x, y, width / 2f, height / 2f), paint);
            }
            Fill(TopLeft, 0, 0);
            Fill(TopRight, width / 2f, 0);
            Fill(BottomLeft, 0, height / 2f);
            Fill(BottomRight, width / 2f, height / 2f);
        }
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(format, 100);
        return data.ToArray();
    }

    /// <summary>A JPEG with an EXIF orientation tag (1-8), as phone cameras write.</summary>
    public static byte[] JpegWithOrientation(int width, int height, int orientation)
    {
        var jpeg = Quadrants(width, height, SKEncodedImageFormat.Jpeg);
        byte[] app1 =
        {
            0xFF, 0xE1, 0x00, 0x22,                         // APP1 marker, length 34
            (byte)'E', (byte)'x', (byte)'i', (byte)'f', 0, 0, // "Exif\0\0"
            (byte)'M', (byte)'M', 0x00, 0x2A,               // big-endian TIFF header
            0x00, 0x00, 0x00, 0x08,                         // offset of the first IFD
            0x00, 0x01,                                     // one entry
            0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, // tag 0x0112 Orientation, SHORT, count 1
            0x00, (byte)orientation, 0x00, 0x00,            // value
            0x00, 0x00, 0x00, 0x00                          // no next IFD
        };
        // Insert straight after the SOI marker (FF D8).
        return jpeg.Take(2).Concat(app1).Concat(jpeg.Skip(2)).ToArray();
    }

    public static SKColor PixelAt(byte[] encoded, int x, int y)
    {
        using var bitmap = SKBitmap.Decode(encoded);
        return bitmap.GetPixel(x, y);
    }

    public static bool IsClose(SKColor actual, SKColor expected) =>
        Math.Abs(actual.Red - expected.Red) < 60
        && Math.Abs(actual.Green - expected.Green) < 60
        && Math.Abs(actual.Blue - expected.Blue) < 60;
}
