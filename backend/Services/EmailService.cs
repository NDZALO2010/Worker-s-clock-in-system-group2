using System.Net;
using System.Net.Mail;

namespace BiometricCore.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string body)
    {
        var host = _config["Email:Host"];
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogWarning("Email:Host is not configured; skipping email dispatch to {ToEmail} (\"{Subject}\").", toEmail, subject);
            return;
        }

        var port = int.Parse(_config["Email:Port"] ?? "587");
        var username = _config["Email:Username"] ?? string.Empty;
        var password = _config["Email:Password"] ?? string.Empty;
        var from = _config["Email:From"] ?? "noreply@clockit.local";
        var enableSsl = bool.Parse(_config["Email:EnableSsl"] ?? "true");

        try
        {
            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = enableSsl
            };

            using var message = new MailMessage(from, toEmail, subject, body);
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail} (\"{Subject}\").", toEmail, subject);
        }
    }
}
