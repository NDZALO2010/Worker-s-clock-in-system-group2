using Microsoft.AspNetCore.Http;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace BiometricCore.Swagger;

public class FileUploadOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (operation.RequestBody == null || operation.RequestBody.Content == null)
            return;

        var hasFile = context.MethodInfo.GetParameters().Any(p =>
            IsFileType(p.ParameterType) ||
            p.ParameterType.GetProperties().Any(pi => IsFileType(pi.PropertyType)));

        if (!hasFile)
            return;

        var schema = new OpenApiSchema
        {
            Type = "object",
            Properties = new Dictionary<string, OpenApiSchema>(),
            Required = new HashSet<string>()
        };

        foreach (var parameter in context.MethodInfo.GetParameters())
        {
            if (parameter.ParameterType == typeof(Guid))
            {
                schema.Properties[parameter.Name!] = new OpenApiSchema
                {
                    Type = "string",
                    Format = "uuid"
                };
                schema.Required.Add(parameter.Name!);
            }

            foreach (var property in parameter.ParameterType.GetProperties())
            {
                if (IsFileType(property.PropertyType))
                {
                    schema.Properties[property.Name] = new OpenApiSchema
                    {
                        Type = "string",
                        Format = "binary"
                    };
                    schema.Required.Add(property.Name);
                }
                else if (property.PropertyType == typeof(Guid))
                {
                    schema.Properties[property.Name] = new OpenApiSchema
                    {
                        Type = "string",
                        Format = "uuid"
                    };
                    schema.Required.Add(property.Name);
                }
            }
        }

        if (schema.Properties.Count == 0)
            return;

        operation.RequestBody.Content["multipart/form-data"] = new OpenApiMediaType
        {
            Schema = schema
        };

        operation.Parameters.Clear();
    }

    private static bool IsFileType(Type type)
    {
        if (type == typeof(IFormFile))
            return true;

        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(IEnumerable<>) &&
            type.GetGenericArguments()[0] == typeof(IFormFile))
        {
            return true;
        }

        return false;
    }
}
