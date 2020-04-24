using System.Threading.Tasks;
using DatingApp.api.Data;
using DatingApp.api.Dtos;
using DatingApp.api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using System.Collections.Generic;
using System.Security.Claims;
using System;

namespace DatingApp.api.Controllers
{
    [ServiceFilter(typeof(LogUserActivity))]
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        
        private readonly IDatingRepository _repo;
        private readonly IMapper _mapper;
        public UsersController(IDatingRepository repo, IMapper mapper)
        {
            _repo= repo;
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery]UserParams userParams)
        {
            var users = await _repo.GetUsers(userParams);
            var usersToreturn = _mapper.Map<IEnumerable<UserForListDto>>(users);
            Response.AddPagination(users.CurrentPage,  users.TotalCount, users.PageSize,users.TotalPages);
            return Ok(usersToreturn);
        }

        [HttpGet("{id}", Name = "GetUser")]
       public async Task<IActionResult> GetUser(int id)
        {
            var user = await _repo.GetUser(id);
            var userToreturn = _mapper.Map<UserForDetailedDto>(user);
            return Ok(userToreturn);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, UserForUpdateDto userForUpdateDto)
        {
            if (id != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
            return Unauthorized();
            var userFromRepo = await _repo.GetUser(id);

            _mapper.Map(userForUpdateDto, userFromRepo);

            if (await _repo.SaveAll())
            return NoContent();

            throw new Exception($"Updating user {id} failed on save");
        }

    }
}