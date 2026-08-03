using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BiometricCore.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueOpenAttendanceSessionPerEmployee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendance_EmployeeId",
                table: "Attendance");

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_OneOpenSessionPerEmployee",
                table: "Attendance",
                column: "EmployeeId",
                unique: true,
                filter: "\"ClockOut\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendance_OneOpenSessionPerEmployee",
                table: "Attendance");

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_EmployeeId",
                table: "Attendance",
                column: "EmployeeId");
        }
    }
}
