using Microsoft.EntityFrameworkCore;
using Knitnet.Shared.Models;

namespace Knitnet.Shared.Services;

/// <summary>
/// FIX 1: Shared service for company provisioning.
/// This is the ONLY place company creation logic exists.
/// Both UserApi (signup) and any future API that needs to create companies
/// must use this service — no direct EF inserts elsewhere.
/// </summary>
public interface ICompanyProvisionService
{
    /// <summary>
    /// Creates a Company record linked to an existing User via user_id FK.
    /// Returns the newly created Company's Uid.
    /// </summary>
    Task<Guid> ProvisionCompanyAsync(DbContext dbContext, int userId, string companyName, string contactNo);
}

public class CompanyProvisionService : ICompanyProvisionService
{
    public async Task<Guid> ProvisionCompanyAsync(DbContext dbContext, int userId, string companyName, string contactNo)
    {
        // Validate: user must exist
        var userExists = await dbContext.Set<User>().AnyAsync(u => u.Id == userId);
        if (!userExists)
            throw new ArgumentException($"User with id {userId} not found");

        // Validate: user must not already have a company
        var alreadyHasCompany = await dbContext.Set<Company>().AnyAsync(c => c.UserId == userId);
        if (alreadyHasCompany)
            throw new InvalidOperationException($"User {userId} already has a company");

        var company = new Company
        {
            UserId = userId,
            CompanyName = companyName,
            ContactNo = contactNo
        };

        dbContext.Set<Company>().Add(company);
        await dbContext.SaveChangesAsync();

        return company.Uid;
    }
}
