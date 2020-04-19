using DatingApp.api.Data;
using DatingApp.api.Models;
using DatingApp.api.Dtos;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Text;
using System;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace DatingApp.api.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
            private readonly IAuthRepository _repo;

            private readonly IConfiguration _config;

            public AuthController(IAuthRepository repo, IConfiguration config) 
            {
                _repo = repo;
                _config = config;
            }

            [HttpPost("register")]
            public async Task<IActionResult> Register(UserForRegisterDto userForRegisterDto)
            {
                    //validate request

                    userForRegisterDto.Username = userForRegisterDto.Username.ToLower();

                    if (await _repo.UserExists(userForRegisterDto.Username))
                    return BadRequest("Username already exists");

                    var userToCreate = new User
                    {
                        Username = userForRegisterDto.Username
                    };

                    var createdUser = await _repo.Register(userToCreate,userForRegisterDto.Password);

                    return StatusCode(201);
            }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto userForLoginDto)
        {
            var userFromRepo = await _repo.Login(userForLoginDto.Username.ToLower(), userForLoginDto.Password);

            if (userFromRepo== null)
            return Unauthorized();

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userFromRepo.ID.ToString()),
                new Claim(ClaimTypes.Name, userFromRepo.Username)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8
            .GetBytes(_config.GetSection("AppSettings:Token").Value));

            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var toeknDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.Now.AddDays(1),
                SigningCredentials = credentials 

            };

            var tokenHandler = new  JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(toeknDescriptor);

            return Ok(new {
                    toekn = tokenHandler.WriteToken(token)
            });
    }
}
}