using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BiometricCore.Migrations
{
    /// <inheritdoc />
    public partial class AddWebAuthnCredentials_RemoveFingerprintProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FingerprintProfiles");

            migrationBuilder.CreateTable(
                name: "WebAuthnCredentials",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CredentialId = table.Column<byte[]>(type: "bytea", nullable: false),
                    PublicKey = table.Column<byte[]>(type: "bytea", nullable: false),
                    UserHandle = table.Column<byte[]>(type: "bytea", nullable: false),
                    SignCount = table.Column<long>(type: "bigint", nullable: false),
                    CredType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AaGuid = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceLabel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebAuthnCredentials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebAuthnCredentials_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WebAuthnCredentials_CredentialId",
                table: "WebAuthnCredentials",
                column: "CredentialId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WebAuthnCredentials_EmployeeId",
                table: "WebAuthnCredentials",
                column: "EmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WebAuthnCredentials");

            migrationBuilder.CreateTable(
                name: "FingerprintProfiles",
                columns: table => new
                {
                    FingerprintProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FingerprintTemplate = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FingerprintProfiles", x => x.FingerprintProfileId);
                    table.ForeignKey(
                        name: "FK_FingerprintProfiles_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FingerprintProfiles_EmployeeId",
                table: "FingerprintProfiles",
                column: "EmployeeId");
        }
    }
}
