using BiometricCore.Data;
using BiometricCore.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Register Services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("BiometricAttendanceDb"));
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IFacialRecognitionService, FacialRecognitionService>();
builder.Services.AddControllers();

var app = builder.Build();

app.UseAuthorization();
app.MapControllers();

app.Run();