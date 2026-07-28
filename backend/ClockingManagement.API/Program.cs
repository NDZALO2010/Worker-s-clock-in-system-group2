using Microsoft.EntityFrameworkCore;
using ClockingManagement.API.Data;
using ClockingManagement.API.Middleware;
using ClockingManagement.API.Interfaces;
using ClockingManagement.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();

builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddScoped<IAuditService, AuditService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .AllowAnyOrigin()      // Change this later to your Vercel URL
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Register PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services.AddHealthChecks();


var app = builder.Build();


app.UseMiddleware<GlobalExceptionMiddleware>();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health");

app.Run();