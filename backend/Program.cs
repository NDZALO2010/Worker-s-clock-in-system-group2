using System.Text;
using BiometricCore.Data;
using BiometricCore.Middleware;
using BiometricCore.Services;
using BiometricCore.Swagger;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Render (and similar PaaS hosts) assign the listen port via the PORT env var at runtime.
var renderAssignedPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(renderAssignedPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderAssignedPort}");
}

// 1. Configure PostgreSQL via Entity Framework Core
var renderedDbUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string connectionString;

if (!string.IsNullOrEmpty(renderedDbUrl))
{
    var databaseUri = new Uri(renderedDbUrl);
    var userInfo = databaseUri.UserInfo.Split(':', 2);

    var npgsqlBuilder = new NpgsqlConnectionStringBuilder
    {
        Host = databaseUri.Host,
        Port = databaseUri.Port,
        Database = databaseUri.AbsolutePath.TrimStart('/'),
        Username = userInfo.Length > 0 ? userInfo[0] : string.Empty,
        Password = userInfo.Length > 1 ? userInfo[1] : string.Empty,
        SslMode = SslMode.Require
    };

    connectionString = npgsqlBuilder.ConnectionString;
}
else
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Host=localhost;Port=5432;Database=biometricdb;Username=postgres;Password=postgres";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Register Application Services
builder.Services.AddSingleton<IFacialRecognitionService, FacialRecognitionService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAttendanceHubNotifier, AttendanceHubNotifier>();
builder.Services.AddHostedService<MissedClockOutCheckService>();

// WebAuthn (real fingerprint/platform-authenticator support). ServerDomain/Origins must
// match the frontend's origin, since the ceremony runs against the page the browser loaded,
// not the backend's own domain.
builder.Services.AddMemoryCache();
builder.Services.AddFido2(options =>
{
    options.ServerDomain = builder.Configuration["Fido2:ServerDomain"];
    options.ServerName = builder.Configuration["Fido2:ServerName"] ?? "ClockIT";
    options.Origins = new HashSet<string>(
        builder.Configuration.GetSection("Fido2:Origins").Get<string[]>() ?? Array.Empty<string>());
});

// 3. Configure JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("Jwt:Secret is not configured. Set it via environment variable Jwt__Secret or dotnet user-secrets before starting the application.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "BiometricCoreAPI",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "BiometricCoreApp",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };

        // SignalR WebSocket connections can't set an Authorization header, so accept the
        // access token via query string for requests targeting the hub endpoints.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000,http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("ClockItClients", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.OperationFilter<FileUploadOperationFilter>();
});

var app = builder.Build();

// CORS must run first: it registers its response-header logic via Response.OnStarting, which
// only fires if this middleware actually got invoked. Anything that throws upstream of it
// (e.g. AuditLogMiddleware failing a DB write) would otherwise reach the browser with no
// Access-Control-Allow-Origin header, surfacing as an opaque "CORS error" instead of the
// real exception.
app.UseCors("ClockItClients");

// Catches anything unhandled further down the pipeline and turns it into a clean JSON
// response, so failures never look like CORS errors and callers always get a JSON body.
app.UseMiddleware<GlobalExceptionMiddleware>();

// 4. Register Custom Audit Log Middleware
app.UseMiddleware<AuditLogMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<BiometricCore.Hubs.AttendanceHub>("/hubs/attendance");

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var dbContext = services.GetRequiredService<AppDbContext>();

    await DbSeeder.SeedAsync(dbContext, logger);
}

app.Run();
