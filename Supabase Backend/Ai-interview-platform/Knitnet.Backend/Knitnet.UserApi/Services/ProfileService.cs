using Microsoft.EntityFrameworkCore;
using Knitnet.Shared.Models;
using Knitnet.UserApi.Data;
using Knitnet.UserApi.DTOs;

namespace Knitnet.UserApi.Services;

public interface IProfileService
{
    Task<ProfileResponseDto> CreateOrUpdateAsync(int userId, ProfileCreateDto dto);
    Task<ProfileResponseDto?> GetByUserIdAsync(int userId);
}

public class ProfileService : IProfileService
{
    private readonly UserDbContext _db;
    public ProfileService(UserDbContext db) { _db = db; }

    public async Task<ProfileResponseDto> CreateOrUpdateAsync(int userId, ProfileCreateDto dto)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new ArgumentException("User not found");
        user.Name = dto.FullName;

        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile != null)
        {
            profile.FullName = dto.FullName;
            profile.Dob = dto.Dob;
            profile.Age = dto.Age;
            profile.College = dto.College;
            profile.Address = dto.Address;
            profile.Phone = dto.Phone;
            profile.Gender = dto.Gender;
            if (!string.IsNullOrEmpty(dto.PhotoUrl)) profile.PhotoUrl = dto.PhotoUrl;
        }
        else
        {
            profile = new UserProfile
            {
                UserId = userId, FullName = dto.FullName, Email = user.Email,
                Dob = dto.Dob, Age = dto.Age, College = dto.College,
                Address = dto.Address, Phone = dto.Phone,
                PhotoUrl = dto.PhotoUrl ?? string.Empty, Gender = dto.Gender
            };
            _db.UserProfiles.Add(profile);
        }
        await _db.SaveChangesAsync();
        return Map(profile);
    }

    public async Task<ProfileResponseDto?> GetByUserIdAsync(int userId)
    {
        var p = await _db.UserProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
        return p == null ? null : Map(p);
    }

    private static ProfileResponseDto Map(UserProfile p) => new()
    {
        UserId = p.UserId, FullName = p.FullName, Email = p.Email,
        Dob = p.Dob, Age = p.Age, College = p.College,
        Address = p.Address, Phone = p.Phone, PhotoUrl = p.PhotoUrl, Gender = p.Gender
    };
}
