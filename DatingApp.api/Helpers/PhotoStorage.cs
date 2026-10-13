using System;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Hosting;
using SkiaSharp;

namespace DatingApp.api.Helpers
{
    // Stores uploaded photos on the API server's disk, served at /photos. It replaces Cloudinary
    // and needs no account or key. Like the Cloudinary upload it replaces (500x500, crop "fill"),
    // each photo is turned upright, resized to cover 500x500 and cropped from the centre.
    public class PhotoStorage
    {
        private const int Size = 500;

        public string Folder { get; }

        public PhotoStorage(IWebHostEnvironment env)
        {
            Folder = Path.Combine(env.ContentRootPath, "Photos");
            Directory.CreateDirectory(Folder);
        }

        // Returns a result without a Uri when the file isn't an image, as a failed Cloudinary upload did.
        public PhotoUploadResult Upload(Stream stream, string baseUrl)
        {
            using var codec = SKCodec.Create(stream);
            if (codec == null)
                return new PhotoUploadResult();

            using var decoded = SKBitmap.Decode(codec);
            using var upright = ApplyOrientation(decoded, codec.EncodedOrigin);
            using var cropped = CropToFill(upright);

            var format = codec.EncodedFormat == SKEncodedImageFormat.Png ? SKEncodedImageFormat.Png : SKEncodedImageFormat.Jpeg;
            var extension = format == SKEncodedImageFormat.Png ? "png" : "jpg";
            var publicId = Guid.NewGuid().ToString("N");

            using (var image = SKImage.FromBitmap(cropped))
            using (var data = image.Encode(format, 90))
            using (var file = File.Create(Path.Combine(Folder, $"{publicId}.{extension}")))
            {
                data.SaveTo(file);
            }

            return new PhotoUploadResult
            {
                Uri = new Uri($"{baseUrl}/photos/{publicId}.{extension}"),
                PublicId = publicId
            };
        }

        // Returns "ok" when the photo was deleted, like Cloudinary's Destroy.
        public PhotoDeletionResult Destroy(string publicId)
        {
            var files = Directory.GetFiles(Folder, publicId + ".*");
            foreach (var file in files)
                File.Delete(file);

            return new PhotoDeletionResult { Result = files.Any() ? "ok" : "not found" };
        }

        private static SKBitmap CropToFill(SKBitmap source)
        {
            var scale = Math.Max((float)Size / source.Width, (float)Size / source.Height);
            var cropWidth = Size / scale;
            var cropHeight = Size / scale;
            var sourceRect = SKRect.Create((source.Width - cropWidth) / 2, (source.Height - cropHeight) / 2, cropWidth, cropHeight);

            var result = new SKBitmap(Size, Size);
            using var canvas = new SKCanvas(result);
            using var image = SKImage.FromBitmap(source);
            canvas.DrawImage(image, sourceRect, SKRect.Create(Size, Size), new SKSamplingOptions(SKCubicResampler.Mitchell));
            return result;
        }

        // Rotates/flips the pixels so the photo shows the way it was taken (EXIF orientation).
        private static SKBitmap ApplyOrientation(SKBitmap source, SKEncodedOrigin origin)
        {
            var swap = origin == SKEncodedOrigin.LeftTop || origin == SKEncodedOrigin.RightTop
                || origin == SKEncodedOrigin.RightBottom || origin == SKEncodedOrigin.LeftBottom;
            var result = new SKBitmap(swap ? source.Height : source.Width, swap ? source.Width : source.Height);

            using var canvas = new SKCanvas(result);
            switch (origin)
            {
                case SKEncodedOrigin.TopRight: canvas.Scale(-1, 1, result.Width / 2f, 0); break;
                case SKEncodedOrigin.BottomRight: canvas.RotateDegrees(180, result.Width / 2f, result.Height / 2f); break;
                case SKEncodedOrigin.BottomLeft: canvas.Scale(1, -1, 0, result.Height / 2f); break;
                case SKEncodedOrigin.LeftTop: canvas.Translate(result.Width, 0); canvas.RotateDegrees(90); canvas.Scale(1, -1, 0, source.Height / 2f); break;
                case SKEncodedOrigin.RightTop: canvas.Translate(result.Width, 0); canvas.RotateDegrees(90); break;
                case SKEncodedOrigin.RightBottom: canvas.Translate(0, result.Height); canvas.RotateDegrees(-90); canvas.Scale(1, -1, 0, source.Height / 2f); break;
                case SKEncodedOrigin.LeftBottom: canvas.Translate(0, result.Height); canvas.RotateDegrees(-90); break;
            }
            canvas.DrawBitmap(source, 0, 0);
            return result;
        }
    }

    public class PhotoUploadResult
    {
        public Uri Uri { get; set; }
        public string PublicId { get; set; }
    }

    public class PhotoDeletionResult
    {
        public string Result { get; set; }
    }
}
