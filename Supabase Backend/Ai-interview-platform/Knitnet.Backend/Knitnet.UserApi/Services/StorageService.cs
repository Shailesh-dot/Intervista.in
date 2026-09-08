using Microsoft.Extensions.Options;
using Knitnet.Shared.Settings;

namespace Knitnet.UserApi.Services;

/// <summary>
/// NEW implementation replacing Cloudinary.
/// Uses Supabase Storage REST API for file uploads.
/// Buckets: profile-images (public), company-logos (public), verification-docs (private).
/// </summary>
public interface IStorageService
{
    Task<string> UploadAsync(IFormFile file, string bucket, string folder);
    string GetPublicUrl(string bucket, string path);
    Task<string> GetSignedUrlAsync(string bucket, string path, int expirySeconds = 3600);
}

public class SupabaseStorageService : IStorageService
{
    private readonly SupabaseSettings _settings;
    private readonly HttpClient _http;

    public SupabaseStorageService(IOptions<SupabaseSettings> settings, IHttpClientFactory httpFactory)
    {
        _settings = settings.Value;
        _http = httpFactory.CreateClient("Supabase");
        _http.DefaultRequestHeaders.Add("apikey", _settings.ServiceRoleKey);
        _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.ServiceRoleKey}");
    }

    public async Task<string> UploadAsync(IFormFile file, string bucket, string folder)
    {
        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var objectPath = string.IsNullOrEmpty(folder) ? fileName : $"{folder}/{fileName}";

        using var stream = file.OpenReadStream();
        var content = new StreamContent(stream);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            file.ContentType ?? "application/octet-stream");

        // x-upsert: true tells Supabase to overwrite if the object already exists
        // (avoids 400 on duplicate-name uploads)
        content.Headers.TryAddWithoutValidation("x-upsert", "true");

        var url = $"{_settings.Url}/storage/v1/object/{bucket}/{objectPath}";

        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        request.Headers.TryAddWithoutValidation("x-upsert", "true");

        var response = await _http.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"Supabase Storage upload failed [{(int)response.StatusCode}]: {body}");
        }

        return GetPublicUrl(bucket, objectPath);
    }

    public string GetPublicUrl(string bucket, string path)
        => $"{_settings.Url}/storage/v1/object/public/{bucket}/{path}";

    public async Task<string> GetSignedUrlAsync(string bucket, string path, int expirySeconds = 3600)
    {
        var url = $"{_settings.Url}/storage/v1/object/sign/{bucket}/{path}";
        var payload = new { expiresIn = expirySeconds };
        var content = new StringContent(
            System.Text.Json.JsonSerializer.Serialize(payload),
            System.Text.Encoding.UTF8, "application/json");

        var response = await _http.PostAsync(url, content);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var json = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(body);
        return $"{_settings.Url}{json.GetProperty("signedURL").GetString()}";
    }
}
