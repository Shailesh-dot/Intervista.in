# Diagnostic Report: baseline-login-50 Root Cause Analysis

## 1. Exact Exception Data (Captured from Windows Event Log / DeveloperExceptionPage)

```text
Exception: Npgsql.PostgresException (0x80004005): XX000: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 30
   Severity: FATAL
   SqlState: XX000
   MessageText: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 30
   at Npgsql.Internal.NpgsqlConnector.<Open>g__OpenCore|213_1(...)
   at Npgsql.Internal.NpgsqlConnector.Open(...)
   at Npgsql.PoolingDataSource.OpenNewConnector(...)
   at Npgsql.PoolingDataSource.<Get>g__RentAsync|33_0(...)
   at Npgsql.NpgsqlConnection.<Open>g__OpenAsync|42_0(...)
   at Microsoft.EntityFrameworkCore.Storage.RelationalConnection.OpenInternalAsync(...)
   at Knitnet.UserApi.Services.AuthService.LoginAsync(LoginDto dto) in Knitnet.UserApi\Services\AuthService.cs:line 151
```

## 2. Failure Mechanism & Stage
- **Failing Operation:** `_db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email)`
- **Stage:** Physical connection open (`Npgsql.PoolingDataSource.OpenNewConnector` / socket handshake to remote Supabase pooler).
- **BCrypt Execution:** NOT reached on the 31 failed requests.
- **JWT Generation:** NOT reached on the 31 failed requests.

## 3. Database Configuration Details
- **Target Host:** `aws-1-ap-south-1.pooler.supabase.com`
- **Port:** `5432` (Supabase **Session Pooler**)
- **Pooling Mode:** Session Mode (`pool_mode=session`, server-side cap: 30)
- **Local Npgsql MaxPoolSize:** Default (100)
- **Local Npgsql MinPoolSize:** Default (0)
- **Connection Timeout:** 60s
- **Command Timeout:** 60s
- **Keepalive:** 30s
- **DbContext Pooling:** None (`AddDbContext<UserDbContext>` standard scoped)

## 4. Why Exactly 19 Succeeded and 31 Failed
- Supabase session pooler hard ceiling: `pool_size: 30`.
- At the time of the burst, ~11 sessions were already held (idle pool connections from UserApi and Supabase platform background services).
- 19 of the 50 burst requests successfully acquired the remaining slots up to 30.
- The remaining 31 requests were immediately rejected with `FATAL: (EMAXCONNSESSION)`.
