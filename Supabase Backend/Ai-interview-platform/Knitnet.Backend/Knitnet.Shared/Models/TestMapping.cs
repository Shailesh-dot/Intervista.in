using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

[Table("test_mappings")]
public class TestMapping
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("test_id")]
    public string TestId { get; set; } = string.Empty;

    [Column("test_code")]
    public string TestCode { get; set; } = string.Empty;

    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Column("hr_id")]
    public Guid HrId { get; set; }

    public AiInterviewMapping? AiInterview { get; set; }
    public VerbalMapping? Verbal { get; set; }
    public CodingMapping? Coding { get; set; }
    public AptitudeMapping? Aptitude { get; set; }

    // Navigation properties for FK enforcement
    public TestInfo? TestInfo { get; set; }
    public ICollection<ResultBase> Results { get; set; } = new List<ResultBase>();
}

[Table("ai_interview_mappings")]
public class AiInterviewMapping
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("test_mapping_id")]
    public int TestMappingId { get; set; }

    [Column("ai_interview_code")]
    public string AiInterviewCode { get; set; } = string.Empty;

    [Column("no_of_questions")]
    public int NoOfQuestions { get; set; } = 15;

    [ForeignKey("TestMappingId")]
    public TestMapping? TestMapping { get; set; }
}

[Table("verbal_mappings")]
public class VerbalMapping
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("test_mapping_id")]
    public int TestMappingId { get; set; }

    [Column("verbal_code")]
    public string VerbalCode { get; set; } = string.Empty;

    [ForeignKey("TestMappingId")]
    public TestMapping? TestMapping { get; set; }
}

[Table("coding_mappings")]
public class CodingMapping
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("test_mapping_id")]
    public int TestMappingId { get; set; }

    [Column("problem_codes")]
    public string ProblemCodes { get; set; } = "[]";

    [ForeignKey("TestMappingId")]
    public TestMapping? TestMapping { get; set; }
}

[Table("aptitude_mappings")]
public class AptitudeMapping
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("test_mapping_id")]
    public int TestMappingId { get; set; }

    [Column("aptitude_code")]
    public string AptitudeCode { get; set; } = string.Empty;

    [Column("no_of_questions")]
    public int NoOfQuestions { get; set; }

    [Column("topics")]
    public string Topics { get; set; } = "[]";

    [ForeignKey("TestMappingId")]
    public TestMapping? TestMapping { get; set; }
}
