using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Knitnet.Shared.Models;
using Knitnet.CompanyApi.DTOs;
using Knitnet.CompanyApi.Services;

namespace Knitnet.CompanyApi.Controllers;

// Helper to extract companyId from JWT claims
public abstract class CompanyBaseController : ControllerBase
{
    protected Guid CompanyId => Guid.Parse(User.FindFirst("companyId")?.Value ?? Guid.Empty.ToString());
}

[ApiController, Route("api/company/profile"), Authorize(Roles = "company")]
public class CompanyProfileController : CompanyBaseController
{
    private readonly ICompanyProfileService _svc;
    public CompanyProfileController(ICompanyProfileService svc) { _svc = svc; }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var r = await _svc.GetAsync(CompanyId);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("info")]
    public async Task<IActionResult> UpdateInfo(CompanyInfoCreateDto dto)
    {
        try { await _svc.CreateOrUpdateInfoAsync(CompanyId, dto); return Ok(new { message = "Saved" }); }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }
}

/// <summary>
/// FIX 2: HR controller with proper JWT-based auth.
/// - Register: company role only (company creates HRs)
/// - Login: anonymous (returns JWT with role=hr)
/// - List/Exists: company or hr role
/// </summary>
[ApiController, Route("api/company/hr")]
public class HRController : CompanyBaseController
{
    private readonly IHRService _svc;
    public HRController(IHRService svc) { _svc = svc; }

    protected Guid HrId => Guid.Parse(User.FindFirst("hrId")?.Value ?? Guid.Empty.ToString());

    [Authorize(Roles = "company,hr"), HttpGet("exists")]
    public async Task<IActionResult> Exists([FromQuery] string email)
        => Ok(new { registered = await _svc.EmailExistsAsync(email) });

    [Authorize(Roles = "company"), HttpPost("register")]
    public async Task<IActionResult> Register(HRRegisterDto dto)
    {
        try { return Ok(new { message = await _svc.RegisterAsync(CompanyId, dto) }); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login(HRLoginDto dto)
    {
        try { return Ok(await _svc.LoginAsync(dto)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    [Authorize(Roles = "company,hr"), HttpGet("list")]
    public async Task<IActionResult> List()
        => Ok(await _svc.GetByCompanyAsync(CompanyId));
}

[ApiController, Route("api/company/test"), Authorize(Roles = "company,hr")]
public class TestController : CompanyBaseController
{
    private readonly ITestService _svc;
    public TestController(ITestService svc) { _svc = svc; }

    [HttpPost("create")]
    public async Task<IActionResult> Create(CreateTestDto dto)
    {
        try { return Ok(await _svc.CreateAsync(CompanyId, dto)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("exists/{testId}")]
    public async Task<IActionResult> Exists(string testId)
        => Ok(new { registered = await _svc.ExistsAsync(testId) });

    [HttpGet("list")]
    public async Task<IActionResult> List()
        => Ok(await _svc.GetCompanyTestsAsync(CompanyId));

}

[ApiController, Route("api/company/mapping"), Authorize(Roles = "company,hr")]
public class MappingController : CompanyBaseController
{
    private readonly IMappingService _svc;
    public MappingController(IMappingService svc) { _svc = svc; }

    [HttpPost("create")]
    public async Task<IActionResult> Create(CreateMappingDto dto)
        => Ok(await _svc.CreateAsync(CompanyId, dto));

    [HttpGet("all")]
    public async Task<IActionResult> GetAll()
        => Ok(await _svc.GetAllAsync(CompanyId));
}

[ApiController, Route("api/company/results"), Authorize(Roles = "company,hr")]
public class ResultController : CompanyBaseController
{
    private readonly IResultService _svc;
    public ResultController(IResultService svc) { _svc = svc; }

    [HttpPost]
    public async Task<IActionResult> Create(ResultBase data)
    {
        try { return Ok(await _svc.CreateAsync(CompanyId, data)); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _svc.GetAllAsync(CompanyId));
}

[ApiController, Route("api/company/credit-points"), Authorize(Roles = "company,hr")]
public class CreditPointController : ControllerBase
{
    private readonly ICreditPointService _svc;
    public CreditPointController(ICreditPointService svc) { _svc = svc; }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _svc.GetAllAsync());
}
