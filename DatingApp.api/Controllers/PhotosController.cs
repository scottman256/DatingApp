using DatingApp.api.Data;
using DatingApp.api.Helpers;
using DatingApp.api.Dtos;
using DatingApp.api.Models;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;


using System.Threading.Tasks;
using System.Security.Claims;
using System.Linq;

namespace DatingApp.api.Controllers
{
        [Authorize]
        [Route("api/users/{userId}/photos")]
        [ApiController]
        public class PhotosController : ControllerBase
        {
            private readonly IDatingRepository _repo;
            private readonly IMapper _mapper;

            private readonly PhotoStorage _photoStorage;

            public PhotosController(IDatingRepository repo, IMapper mapper,
            PhotoStorage photoStorage)
            {
                _mapper = mapper;
                _repo = repo;
                _photoStorage = photoStorage;
            }

            [HttpGet("{id}", Name = "GetPhoto")]
            public async Task<IActionResult> GetPhoto(int id)
            {
                var photoFromRepo = await _repo.GetPhoto(id);
                var photo = _mapper.Map<PhotoForReturnDto>(photoFromRepo);

                return Ok(photo);
            }

            [HttpPost]
            public async Task<IActionResult> AddPhotoForUser(int userId, 
            [FromForm] PhotoForCreationDto photoForCreationDto)
            {
                
            if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
            return Unauthorized();

            var userFromRepo = await _repo.GetUser(userId);

            var file = photoForCreationDto.File;

            var uploadResult = new PhotoUploadResult();

            if (file.Length > 0)
            {
                using (var stream = file.OpenReadStream())
                {
                    uploadResult = _photoStorage.Upload(stream, $"{Request.Scheme}://{Request.Host}");
                }
            }

            photoForCreationDto.Url = uploadResult.Uri.ToString();
            photoForCreationDto.PublicId = uploadResult.PublicId;

            var photo = _mapper.Map<Photo>(photoForCreationDto);

            if(!userFromRepo.Photos.Any(u => u.IsMain))
            photo.IsMain = true;

            userFromRepo.Photos.Add(photo);

          
            if(await _repo.SaveAll())
            {
                var photoToReturn = _mapper.Map<PhotoForReturnDto>(photo);
                return CreatedAtRoute("GetPhoto",new { userId = userId, id = photo.Id }, 
                photoToReturn);
            }

            return BadRequest("Could not add the photo");
            }
            
            [HttpPost("{id}/setMain")]
            public async Task<IActionResult> SetMainPhoto(int userId, int id)
            {
                if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
                return Unauthorized();

                var user = await _repo.GetUser(userId);

                if (!user.Photos.Any(p => p.Id == id))
                return Unauthorized();

                var photoFromRepo = await _repo.GetPhoto(id);

                if (photoFromRepo.IsMain)
                return BadRequest("This is already the main photo");

                var currentMainPhoto = await _repo.GetMainPhotoForUser(userId);
                currentMainPhoto.IsMain = false;
                photoFromRepo.IsMain = true;

                if (await _repo.SaveAll())
                return NoContent();

                return BadRequest("Could not set photo to main");

            }

            [HttpDelete("{id}")]
            public async Task<IActionResult> DeletePhoto(int userId, int id)
            {
                 if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
                return Unauthorized();

                var user = await _repo.GetUser(userId);

                if (!user.Photos.Any(p => p.Id == id))
                return Unauthorized();

                var photoFromRepo = await _repo.GetPhoto(id);

                if (photoFromRepo.IsMain)
                return BadRequest("You cannot delete your main photo");

                if (photoFromRepo.PublicId != null){
                var result= _photoStorage.Destroy(photoFromRepo.PublicId);

                if (result.Result == "ok") {
                    _repo.Delete(photoFromRepo);
                }
                }
                else
                {
                    _repo.Delete(photoFromRepo);
                } 

                if (await _repo.SaveAll())
                    return Ok();

                    return BadRequest("Failed to delete the photo");
            }
        }
    
}