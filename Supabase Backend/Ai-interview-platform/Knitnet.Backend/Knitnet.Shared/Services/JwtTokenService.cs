using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Knitnet.Shared.Settings;

namespace Knitnet.Shared.Services;

/// <summary>
/// FIX 2: Shared JWT generation so both UserApi and CompanyApi 
/// produce tokens with the same signing key/format.
/// </summary>
public interface IJwtTokenService
{
    string GenerateToken(IEnumerable<Claim> claims, JwtSettings settings);
}

public class JwtTokenService : IJwtTokenService
{
    public string GenerateToken(IEnumerable<Claim> claims, JwtSettings settings)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SecretKey));
        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(settings.ExpiryHours),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
