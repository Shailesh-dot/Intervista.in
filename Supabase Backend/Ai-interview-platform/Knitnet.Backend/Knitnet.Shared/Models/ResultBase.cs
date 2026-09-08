using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

[Table("results")]
public class ResultBase
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("test_id")]
    public string TestId { get; set; } = string.Empty;

    [Column("test_code")]
    public string TestCode { get; set; } = string.Empty;

    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Column("hr_id")]
    public Guid HrId { get; set; }

    [Column("test_mapping_id")]
    public int? TestMappingId { get; set; }

    [Column("total_score")]
    public double TotalScore { get; set; }

    [Column("score_secured")]
    public double ScoreSecured { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AptitudeResult? Aptitude { get; set; }
    public CodingResult? Coding { get; set; }
    public AiInterviewResult? AiInterview { get; set; }
    public VerbalResult? Verbal { get; set; }

    // Navigation property for FK enforcement
    public TestMapping? TestMapping { get; set; }
}

[Table("aptitude_results")]
public class AptitudeResult
{
    [Key] public int Id { get; set; }
    [Column("result_base_id")] public int ResultBaseId { get; set; }
    [Column("aptitude_code")] public string AptitudeCode { get; set; } = string.Empty;
    [Column("module_total_score")] public double ModuleTotalScore { get; set; }
    [Column("module_score_secured")] public double ModuleScoreSecured { get; set; }
    [Column("questions")] public List<string> Questions { get; set; } = new();
    [Column("user_answers")] public List<string> UserAnswers { get; set; } = new();
    [Column("correct_answers")] public List<string> CorrectAnswers { get; set; } = new();
    [Column("topics")] public List<string> Topics { get; set; } = new();
    [Column("correct")] public int Correct { get; set; }
    [Column("incorrect")] public int Incorrect { get; set; }
    [ForeignKey("ResultBaseId")] public ResultBase? ResultBase { get; set; }
}

[Table("coding_results")]
public class CodingResult
{
    [Key] public int Id { get; set; }
    [Column("result_base_id")] public int ResultBaseId { get; set; }
    [Column("coding_code")] public string CodingCode { get; set; } = string.Empty;
    [Column("module_total_score")] public double ModuleTotalScore { get; set; }
    [Column("module_score_secured")] public double ModuleScoreSecured { get; set; }
    [Column("testcase_totals")] public List<int> TestcaseTotals { get; set; } = new();
    [Column("testcase_passed")] public List<int> TestcasePassed { get; set; } = new();
    [Column("answers")] public List<string> Answers { get; set; } = new();
    [ForeignKey("ResultBaseId")] public ResultBase? ResultBase { get; set; }
}

[Table("ai_interview_results")]
public class AiInterviewResult
{
    [Key] public int Id { get; set; }
    [Column("result_base_id")] public int ResultBaseId { get; set; }
    [Column("ai_code")] public string AiCode { get; set; } = string.Empty;
    [Column("module_total_score")] public double ModuleTotalScore { get; set; }
    [Column("module_score_secured")] public double ModuleScoreSecured { get; set; }
    [Column("questions")] public List<string> Questions { get; set; } = new();
    [Column("answers")] public List<string> Answers { get; set; } = new();
    [Column("correct_answers")] public List<string> CorrectAnswers { get; set; } = new();
    [Column("correct")] public int Correct { get; set; }
    [Column("wrong")] public int Wrong { get; set; }
    [ForeignKey("ResultBaseId")] public ResultBase? ResultBase { get; set; }
}

[Table("verbal_results")]
public class VerbalResult
{
    [Key] public int Id { get; set; }
    [Column("result_base_id")] public int ResultBaseId { get; set; }
    [Column("verbal_code")] public string VerbalCode { get; set; } = string.Empty;
    [Column("module_total_score")] public double ModuleTotalScore { get; set; }
    [Column("module_score_secured")] public double ModuleScoreSecured { get; set; }
    [Column("metrics")] public Dictionary<string, double> Metrics { get; set; } = new();
    [Column("listening")] public List<string> Listening { get; set; } = new();
    [Column("speaking")] public List<string> Speaking { get; set; } = new();
    [ForeignKey("ResultBaseId")] public ResultBase? ResultBase { get; set; }
}
