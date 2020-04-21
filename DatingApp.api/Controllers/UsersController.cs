using System.Threading.Tasks;
using DatingApp.api.Data;
using DatingApp.api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using System.Collections.Generic;

namespace DatingApp.api.Controllers
{
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
        public async Task<IActionResult> GetUsers()
        {
            var users = await _repo.GetUsers();
            var usersToreturn = _mapper.Map<IEnumerable<UserForListDto>>(users);
            return Ok(usersToreturn);
        }

        [HttpGet("{id}")]
       public async Task<IActionResult> GetUser(int id)
        {
            var user = await _repo.GetUser(id);
            var userToreturn = _mapper.Map<UserForDetailedDto>(user);
            return Ok(userToreturn);
        }

    }
}