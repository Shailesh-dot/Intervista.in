using Microsoft.EntityFrameworkCore;
using Knitnet.UserApi.Data;

namespace Knitnet.UserApi.Services;

public interface IStudentResultService
{
    Task<object> GetMyResultsAsync(int studentId);
}

public class StudentResultService : IStudentResultService
{
    private readonly UserDbContext _db;
    public StudentResultService(UserDbContext db) { _db = db; }

    public async Task<object> GetMyResultsAsync(int studentId)
    {
        return await _db.Results
            .Where(r => r.StudentId == studentId)
            .Include(r => r.Aptitude).Include(r => r.Coding)
            .Include(r => r.AiInterview).Include(r => r.Verbal)
            .ToListAsync();
    }
}
