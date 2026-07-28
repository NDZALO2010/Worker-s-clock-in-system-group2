using Microsoft.AspNetCore.Mvc;

namespace BiometricsAIBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        [HttpPost("login")]
        public IActionResult Login()
        {
            return Ok(new
            {
                message = "Login endpoint working."
            });
        }

        [HttpPost("register")]
        public IActionResult Register()
        {
            return Ok(new
            {
                message = "Register endpoint working."
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            return Ok(new
            {
                message = "Logout successful."
            });
        }
    }
}