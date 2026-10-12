using DatingApp.api.Controllers;
using Microsoft.Extensions.Logging.Abstractions;

namespace DatingApp.api.Tests;

public class WeatherForecastControllerTests
{
    private static readonly string[] Summaries =
    {
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    };

    [Fact]
    public void Get_ReturnsFiveForecastsForTheNextFiveDays()
    {
        var controller = new WeatherForecastController(NullLogger<WeatherForecastController>.Instance);

        var before = DateTime.Now;
        var forecasts = controller.Get().ToList();
        var after = DateTime.Now;

        Assert.Equal(5, forecasts.Count);
        for (var i = 0; i < forecasts.Count; i++)
        {
            Assert.InRange(forecasts[i].Date, before.AddDays(i + 1), after.AddDays(i + 1));
            Assert.InRange(forecasts[i].TemperatureC, -20, 54);
            Assert.Contains(forecasts[i].Summary, Summaries);
        }
    }

    [Theory]
    [InlineData(0, 32)]
    [InlineData(37, 98)]
    [InlineData(100, 211)]
    [InlineData(-20, -3)]
    public void TemperatureF_IsConvertedFromTemperatureC(int celsius, int fahrenheit)
    {
        var forecast = new WeatherForecast { TemperatureC = celsius };

        Assert.Equal(fahrenheit, forecast.TemperatureF);
    }
}
