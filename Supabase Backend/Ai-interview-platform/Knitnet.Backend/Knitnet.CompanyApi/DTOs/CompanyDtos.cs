namespace Knitnet.CompanyApi.DTOs;

public class CompanyInfoCreateDto
{
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public int? FoundedYear { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? LinkedinUrl { get; set; }
    public string? GithubUrl { get; set; }
}

public class CompanyInfoResponseDto
{
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
}

public class HRRegisterDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class HRLoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class HRResponseDto
{
    public Guid HrId { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
}

/// <summary>
/// FIX 2: HR login now returns JWT token alongside HR identity.
/// </summary>
public class HRLoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public Guid HrId { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "hr";
}

public class CreateTestDto
{
    public string TestId { get; set; } = string.Empty;
    public Guid HrId { get; set; }
    public bool AptitudeModule { get; set; }
    public bool VerbalModule { get; set; }
    public bool InterviewModule { get; set; }
    public bool CodingModule { get; set; }
    public string? AptitudeTopic { get; set; }
    public List<string>? AptitudeTopics { get; set; }
    public List<string>? CodingProblemCodes { get; set; }
    public int InterviewQuestionCount { get; set; } = 15;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int ApproxStudentCount { get; set; }
}

public class CreateMappingDto
{
    public string TestId { get; set; } = string.Empty;
    public string TestCode { get; set; } = string.Empty;
    public Guid HrId { get; set; }
    public string? AiInterviewCode { get; set; }
    public string? VerbalCode { get; set; }
    public List<string>? ProblemCodes { get; set; }
    public string? AptitudeCode { get; set; }
    public int NoOfQuestions { get; set; }
    public List<string>? Topics { get; set; }
}
