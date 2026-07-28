using Microsoft.AspNetCore.Mvc;

namespace BiometricsAIBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FaceRecognitionController : ControllerBase
    {
        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok("Face Recognition API is running.");
        }
    }
}