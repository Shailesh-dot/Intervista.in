using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Json;
using Knitnet.Shared.Models;
using Knitnet.Shared.Services;
using Knitnet.Shared.Settings;
using Knitnet.CompanyApi.Data;
using Knitnet.CompanyApi.DTOs;

namespace Knitnet.CompanyApi.Services;

// ═══════════════════════════════════════════════════════════════
// COMPANY PROFILE SERVICE
// ═══════════════════════════════════════════════════════════════
public interface ICompanyProfileService
{
    Task<CompanyInfoResponseDto?> GetAsync(Guid companyId);
    Task CreateOrUpdateInfoAsync(Guid companyId, CompanyInfoCreateDto dto);
}

public class CompanyProfileService : ICompanyProfileService
{
    private readonly CompanyDbContext _db;
    public CompanyProfileService(CompanyDbContext db) { _db = db; }

    public async Task<CompanyInfoResponseDto?> GetAsync(Guid companyId)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Uid == companyId);
        if (company == null) return null;
        var info = await _db.CompanyInfos.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        return new CompanyInfoResponseDto
        {
            CompanyId = companyId, CompanyName = company.CompanyName,
            Website = info?.Website, Industry = info?.Industry,
            CompanySize = info?.CompanySize, Description = info?.Description,
            LogoUrl = info?.LogoUrl, City = info?.City, State = info?.State, Country = info?.Country
        };
    }

    public async Task CreateOrUpdateInfoAsync(Guid companyId, CompanyInfoCreateDto dto)
    {
        if (!await _db.Companies.AnyAsync(c => c.Uid == companyId))
            throw new KeyNotFoundException("Company not found");

        var existing = await _db.CompanyInfos.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        if (existing == null)
        {
            _db.CompanyInfos.Add(new CompanyInfo
            {
                CompanyId = companyId, Website = dto.Website, Industry = dto.Industry,
                CompanySize = dto.CompanySize, FoundedYear = dto.FoundedYear,
                Description = dto.Description, LogoUrl = dto.LogoUrl,
                AddressLine1 = dto.AddressLine1, AddressLine2 = dto.AddressLine2,
                City = dto.City, State = dto.State, Country = dto.Country,
                PostalCode = dto.PostalCode, LinkedinUrl = dto.LinkedinUrl, GithubUrl = dto.GithubUrl
            });
        }
        else
        {
            existing.Website = dto.Website; existing.Industry = dto.Industry;
            existing.CompanySize = dto.CompanySize; existing.FoundedYear = dto.FoundedYear;
            existing.Description = dto.Description; existing.LogoUrl = dto.LogoUrl;
            existing.AddressLine1 = dto.AddressLine1; existing.AddressLine2 = dto.AddressLine2;
            existing.City = dto.City; existing.State = dto.State; existing.Country = dto.Country;
            existing.PostalCode = dto.PostalCode; existing.LinkedinUrl = dto.LinkedinUrl;
            existing.GithubUrl = dto.GithubUrl; existing.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
    }
}

// ═══════════════════════════════════════════════════════════════
// HR SERVICE - FIX 2: JWT authentication for HR login
// ═══════════════════════════════════════════════════════════════
public interface IHRService
{
    Task<bool> EmailExistsAsync(string email);
    Task<string> RegisterAsync(Guid companyId, HRRegisterDto dto);
    Task<HRLoginResponseDto> LoginAsync(HRLoginDto dto);
    Task<List<HRResponseDto>> GetByCompanyAsync(Guid companyId);
}

public class HRService : IHRService
{
    private readonly CompanyDbContext _db;
    private readonly IJwtTokenService _tokenService;
    private readonly JwtSettings _jwtSettings;

    public HRService(CompanyDbContext db, IJwtTokenService tokenService, IOptions<JwtSettings> jwtSettings)
    {
        _db = db;
        _tokenService = tokenService;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<bool> EmailExistsAsync(string email)
        => await _db.HRs.AnyAsync(h => h.Email == email);

    public async Task<string> RegisterAsync(Guid companyId, HRRegisterDto dto)
    {
        if (await _db.HRs.AnyAsync(h => h.Email == dto.Email))
            throw new ArgumentException("Email already exists");
        _db.HRs.Add(new HR
        {
            CompanyId = companyId, Name = dto.Name, Email = dto.Email,
            PhoneNumber = dto.PhoneNumber, Designation = dto.Designation,
            Department = dto.Department,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        });
        await _db.SaveChangesAsync();
        return "HR registered successfully";
    }

    /// <summary>
    /// FIX 2: HR login now returns JWT with claims: sub=hrId, role=hr, companyId, email.
    /// HR is treated as a first-class authenticated user.
    /// </summary>
    public async Task<HRLoginResponseDto> LoginAsync(HRLoginDto dto)
    {
        var hr = await _db.HRs.FirstOrDefaultAsync(h => h.Email == dto.Email)
            ?? throw new UnauthorizedAccessException("Invalid email");
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, hr.PasswordHash))
            throw new UnauthorizedAccessException("Invalid password");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, hr.HrId.ToString()),
            new(ClaimTypes.Email, hr.Email),
            new(ClaimTypes.Role, "hr"),
            new("companyId", hr.CompanyId.ToString()),
            new("hrId", hr.HrId.ToString())
        };

        return new HRLoginResponseDto
        {
            Token = _tokenService.GenerateToken(claims, _jwtSettings),
            HrId = hr.HrId,
            CompanyId = hr.CompanyId,
            Name = hr.Name,
            Email = hr.Email
        };
    }

    public async Task<List<HRResponseDto>> GetByCompanyAsync(Guid companyId)
        => await _db.HRs.Where(h => h.CompanyId == companyId)
            .Select(h => new HRResponseDto { HrId = h.HrId, CompanyId = h.CompanyId, Name = h.Name, Email = h.Email, PhoneNumber = h.PhoneNumber })
            .ToListAsync();
}

// ═══════════════════════════════════════════════════════════════
// TEST SERVICE - refactored: companyId/hrId from JWT, auto-code
// ═══════════════════════════════════════════════════════════════
public interface ITestService
{
    Task<object> CreateAsync(Guid companyId, CreateTestDto dto); 
    Task<bool> ExistsAsync(string testId);
    Task<IEnumerable<object>> GetCompanyTestsAsync(Guid companyId);
}

public class TestService : ITestService
{
    private readonly CompanyDbContext _db;
    public TestService(CompanyDbContext db) { _db = db; }

    public async Task<object> CreateAsync(Guid companyId, CreateTestDto dto)
    {
        if (await _db.TestInfos.AnyAsync(t => t.TestId == dto.TestId))
        {
            throw new ArgumentException($"Test ID '{dto.TestId}' is already taken. Please enter a unique Test ID.");
        }

        var test = new TestInfo
        {
            TestId = dto.TestId,
            TestCode = Guid.NewGuid().ToString()[..6].ToUpper(),
            CompanyId = companyId, HrId = dto.HrId,
            AptitudeModule = dto.AptitudeModule, VerbalModule = dto.VerbalModule,
            InterviewModule = dto.InterviewModule, CodingModule = dto.CodingModule,
            StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc),
            StartTime = dto.StartTime, EndTime = dto.EndTime,
            ApproxStudentCount = dto.ApproxStudentCount
        };
        _db.TestInfos.Add(test);
        await _db.SaveChangesAsync();

        var mapping = new TestMapping
        {
            TestId = test.TestId,
            TestCode = test.TestCode,
            CompanyId = companyId,
            HrId = dto.HrId
        };
        _db.TestMappings.Add(mapping);
        await _db.SaveChangesAsync();

        if (dto.AptitudeModule)
        {
            List<string> topicsList = new();
            if (dto.AptitudeTopics != null && dto.AptitudeTopics.Count > 0)
            {
                topicsList = dto.AptitudeTopics.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
            }
            else if (!string.IsNullOrWhiteSpace(dto.AptitudeTopic))
            {
                var trimmed = dto.AptitudeTopic.Trim();
                if (trimmed.StartsWith("[") && trimmed.EndsWith("]"))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<List<string>>(trimmed);
                        if (parsed != null && parsed.Count > 0)
                        {
                            topicsList = parsed.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
                        }
                    }
                    catch
                    {
                        topicsList = new List<string> { trimmed };
                    }
                }
                else
                {
                    topicsList = new List<string> { trimmed };
                }
            }

            if (topicsList.Count == 0)
            {
                topicsList.Add("Quantitative Aptitude");
            }

            _db.AptitudeMappings.Add(new AptitudeMapping
            {
                TestMappingId = mapping.Id,
                AptitudeCode = "APT-" + test.TestCode,
                NoOfQuestions = 15,
                Topics = JsonSerializer.Serialize(topicsList)
            });
            await _db.SaveChangesAsync();
        }

        if (dto.InterviewModule)
        {
            var qCount = dto.InterviewQuestionCount;
            if (qCount < 5) qCount = 5;
            if (qCount > 15) qCount = 15;

            _db.AiInterviewMappings.Add(new AiInterviewMapping
            {
                TestMappingId = mapping.Id,
                AiInterviewCode = "AI-" + test.TestCode,
                NoOfQuestions = qCount
            });
            await _db.SaveChangesAsync();
        }

        if (dto.CodingModule)
        {
            var problemCodes = dto.CodingProblemCodes ?? new List<string>();
            var selectionMode = (dto.CodingSelectionMode ?? "fixed").ToLower();
            string? randomConfigJson = null;

            if (selectionMode == "random" && dto.CodingRandomConfig != null)
            {
                var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                randomConfigJson = JsonSerializer.Serialize(dto.CodingRandomConfig, jsonOptions);

                // The pool is now a flat list of all admin-selected IDs.
                if (dto.CodingRandomConfig.Pool?.Count > 0)
                {
                    problemCodes = dto.CodingRandomConfig.Pool.Distinct().ToList();
                }
            }

            _db.CodingMappings.Add(new CodingMapping
            {
                TestMappingId = mapping.Id,
                ProblemCodes = JsonSerializer.Serialize(problemCodes),
                SelectionMode = selectionMode,
                RandomConfig = randomConfigJson
            });
            await _db.SaveChangesAsync();
        }

        return new
        {
            message = "Test created",
            data = new
            {
                testId = test.TestId,
                testCode = test.TestCode,
                companyId = test.CompanyId,
                hrId = test.HrId,
                aptitudeModule = test.AptitudeModule,
                verbalModule = test.VerbalModule,
                interviewModule = test.InterviewModule,
                codingModule = test.CodingModule,
                startDate = test.StartDate,
                endDate = test.EndDate
            }
        };
    }

    public async Task<bool> ExistsAsync(string testId)
        => await _db.TestInfos.AnyAsync(t => t.TestId.ToLower() == testId.ToLower());

    public async Task<IEnumerable<object>> GetCompanyTestsAsync(Guid companyId)
    {
        var defaultId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
        
        var tests = await _db.TestInfos
            .Where(t => t.CompanyId == companyId || (companyId != Guid.Empty && t.CompanyId == defaultId))
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.TestId,
                t.CreatedAt,
                HrName = _db.HRs.Where(h => h.HrId == t.HrId).Select(h => h.Name).FirstOrDefault() ?? "Unknown",
                AttendedCount = _db.Results.Count(r => r.TestId == t.TestId),
                t.AptitudeModule,
                t.VerbalModule,
                t.InterviewModule,
                t.CodingModule
            })
            .ToListAsync();
        return tests;
    }
}

// ═══════════════════════════════════════════════════════════════
// MAPPING SERVICE - refactored: companyId from JWT
// ═══════════════════════════════════════════════════════════════
public interface IMappingService
{
    Task<object> CreateAsync(Guid companyId, CreateMappingDto dto);
    Task<object> GetAllAsync(Guid companyId);
}

public class MappingService : IMappingService
{
    private readonly CompanyDbContext _db;
    public MappingService(CompanyDbContext db) { _db = db; }

    public async Task<object> CreateAsync(Guid companyId, CreateMappingDto dto)
    {
        var mapping = new TestMapping
        {
            TestId = dto.TestId, TestCode = dto.TestCode,
            CompanyId = companyId, HrId = dto.HrId
        };
        _db.TestMappings.Add(mapping);
        await _db.SaveChangesAsync();

        if (dto.AiInterviewCode != null)
            _db.AiInterviewMappings.Add(new AiInterviewMapping { TestMappingId = mapping.Id, AiInterviewCode = dto.AiInterviewCode });
        if (dto.VerbalCode != null)
            _db.VerbalMappings.Add(new VerbalMapping { TestMappingId = mapping.Id, VerbalCode = dto.VerbalCode });
        if (dto.ProblemCodes != null)
            _db.CodingMappings.Add(new CodingMapping { TestMappingId = mapping.Id, ProblemCodes = JsonSerializer.Serialize(dto.ProblemCodes) });
        if (dto.AptitudeCode != null)
            _db.AptitudeMappings.Add(new AptitudeMapping
            {
                TestMappingId = mapping.Id, AptitudeCode = dto.AptitudeCode,
                NoOfQuestions = dto.NoOfQuestions, Topics = JsonSerializer.Serialize(dto.Topics)
            });
        await _db.SaveChangesAsync();
        return new { message = "Mapping created" };
    }

    public async Task<object> GetAllAsync(Guid companyId)
        => await _db.TestMappings.Where(t => t.CompanyId == companyId)
            .Include(t => t.AiInterview).Include(t => t.Verbal)
            .Include(t => t.Coding).Include(t => t.Aptitude).ToListAsync();
}

// ═══════════════════════════════════════════════════════════════
// RESULT SERVICE - secured: validates test/mapping/student ownership
// ═══════════════════════════════════════════════════════════════
public interface IResultService
{
    Task<object> CreateAsync(Guid companyId, ResultBase data);
    Task<object> GetAllAsync(Guid companyId);
}

public class ResultService : IResultService
{
    private readonly CompanyDbContext _db;
    public ResultService(CompanyDbContext db) { _db = db; }

    public async Task<object> CreateAsync(Guid companyId, ResultBase data)
    {
        var test = await _db.TestInfos.FirstOrDefaultAsync(t => t.TestId == data.TestId);
        if (test == null)
            throw new ArgumentException($"Test '{data.TestId}' not found");
        if (test.CompanyId != companyId)
            throw new UnauthorizedAccessException("Test does not belong to your company");

        if (!string.IsNullOrEmpty(data.TestCode))
        {
            var mappingExists = await _db.TestMappings.AnyAsync(
                m => m.TestId == data.TestId && m.TestCode == data.TestCode);
            if (!mappingExists)
                throw new ArgumentException($"No mapping found for test '{data.TestId}' with code '{data.TestCode}'");
        }

        data.CompanyId = companyId;
        data.HrId = test.HrId;

        _db.Results.Add(data);
        await _db.SaveChangesAsync();
        return data;
    }

    public async Task<object> GetAllAsync(Guid companyId)
        => await _db.Results.Where(r => r.CompanyId == companyId)
            .Include(x => x.Aptitude).Include(x => x.Coding)
            .Include(x => x.AiInterview).Include(x => x.Verbal).ToListAsync();
}

// ═══════════════════════════════════════════════════════════════
// CREDIT POINT SERVICE (NEW)
// ═══════════════════════════════════════════════════════════════
public interface ICreditPointService { Task<object> GetAllAsync(); }

public class CreditPointService : ICreditPointService
{
    private readonly CompanyDbContext _db;
    public CreditPointService(CompanyDbContext db) { _db = db; }
    public async Task<object> GetAllAsync() => await _db.CreditPoints.ToListAsync();
}
