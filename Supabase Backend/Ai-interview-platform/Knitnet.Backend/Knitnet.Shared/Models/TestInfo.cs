using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

[Table("test_infos")]
public class TestInfo
{
    [Key]
    [Column("test_id")]
    public string TestId { get; set; } = string.Empty;

    [Column("test_code")]
    public string TestCode { get; set; } = string.Empty;

    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Column("hr_id")]
    public Guid HrId { get; set; }

    [Column("aptitude_module")]
    public bool AptitudeModule { get; set; }

    [Column("verbal_module")]
    public bool VerbalModule { get; set; }

    [Column("interview_module")]
    public bool InterviewModule { get; set; }

    [Column("coding_module")]
    public bool CodingModule { get; set; }

    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    public DateTime EndDate { get; set; }

    [Column("start_time")]
    public TimeSpan StartTime { get; set; }

    [Column("end_time")]
    public TimeSpan EndTime { get; set; }

    [Column("approx_student_count")]
    public int ApproxStudentCount { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties for FK enforcement
    public Company? Company { get; set; }
    public ICollection<TestMapping> TestMappings { get; set; } = new List<TestMapping>();
}
