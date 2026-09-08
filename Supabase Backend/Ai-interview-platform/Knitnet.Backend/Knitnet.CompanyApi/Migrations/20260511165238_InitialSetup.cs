using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Knitnet.CompanyApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialSetup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "credit_points",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    module = table.Column<string>(type: "text", nullable: false),
                    points = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_points", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    password = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "companies",
                columns: table => new
                {
                    uid = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    company_name = table.Column<string>(type: "text", nullable: false),
                    contact_no = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_companies", x => x.uid);
                    table.ForeignKey(
                        name: "FK_companies_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "identity_verifications",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    unique_id = table.Column<string>(type: "text", nullable: true),
                    user_name = table.Column<string>(type: "text", nullable: true),
                    aadhaar_last4 = table.Column<string>(type: "text", nullable: true),
                    aadhaar_zip_url = table.Column<string>(type: "text", nullable: true),
                    passport_photo_url = table.Column<string>(type: "text", nullable: true),
                    share_code = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_identity_verifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_identity_verifications_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "user_profiles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    dob = table.Column<DateOnly>(type: "date", nullable: false),
                    age = table.Column<int>(type: "integer", nullable: false),
                    college = table.Column<string>(type: "text", nullable: false),
                    address = table.Column<string>(type: "text", nullable: false),
                    phone = table.Column<string>(type: "text", nullable: false),
                    photo_url = table.Column<string>(type: "text", nullable: false),
                    gender = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "company_infos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    website = table.Column<string>(type: "text", nullable: true),
                    industry = table.Column<string>(type: "text", nullable: true),
                    company_size = table.Column<string>(type: "text", nullable: true),
                    founded_year = table.Column<int>(type: "integer", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    logo_url = table.Column<string>(type: "text", nullable: true),
                    address_line1 = table.Column<string>(type: "text", nullable: true),
                    address_line2 = table.Column<string>(type: "text", nullable: true),
                    city = table.Column<string>(type: "text", nullable: true),
                    state = table.Column<string>(type: "text", nullable: true),
                    country = table.Column<string>(type: "text", nullable: true),
                    postal_code = table.Column<string>(type: "text", nullable: true),
                    linkedin_url = table.Column<string>(type: "text", nullable: true),
                    github_url = table.Column<string>(type: "text", nullable: true),
                    is_verified = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_company_infos", x => x.id);
                    table.ForeignKey(
                        name: "FK_company_infos_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "uid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "hrs",
                columns: table => new
                {
                    hr_id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    phone_number = table.Column<string>(type: "text", nullable: false),
                    designation = table.Column<string>(type: "text", nullable: false),
                    department = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hrs", x => x.hr_id);
                    table.ForeignKey(
                        name: "FK_hrs_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "uid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "test_infos",
                columns: table => new
                {
                    test_id = table.Column<string>(type: "text", nullable: false),
                    test_code = table.Column<string>(type: "text", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hr_id = table.Column<Guid>(type: "uuid", nullable: false),
                    aptitude_module = table.Column<bool>(type: "boolean", nullable: false),
                    verbal_module = table.Column<bool>(type: "boolean", nullable: false),
                    interview_module = table.Column<bool>(type: "boolean", nullable: false),
                    coding_module = table.Column<bool>(type: "boolean", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    start_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    end_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    approx_student_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_test_infos", x => x.test_id);
                    table.ForeignKey(
                        name: "FK_test_infos_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "uid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "test_mappings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    test_id = table.Column<string>(type: "text", nullable: false),
                    test_code = table.Column<string>(type: "text", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hr_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_test_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_test_mappings_test_infos_test_id",
                        column: x => x.test_id,
                        principalTable: "test_infos",
                        principalColumn: "test_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_interview_mappings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    test_mapping_id = table.Column<int>(type: "integer", nullable: false),
                    ai_interview_code = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_interview_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_interview_mappings_test_mappings_test_mapping_id",
                        column: x => x.test_mapping_id,
                        principalTable: "test_mappings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aptitude_mappings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    test_mapping_id = table.Column<int>(type: "integer", nullable: false),
                    aptitude_code = table.Column<string>(type: "text", nullable: false),
                    no_of_questions = table.Column<int>(type: "integer", nullable: false),
                    topics = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aptitude_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_aptitude_mappings_test_mappings_test_mapping_id",
                        column: x => x.test_mapping_id,
                        principalTable: "test_mappings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "coding_mappings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    test_mapping_id = table.Column<int>(type: "integer", nullable: false),
                    problem_codes = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_coding_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_coding_mappings_test_mappings_test_mapping_id",
                        column: x => x.test_mapping_id,
                        principalTable: "test_mappings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "results",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    student_id = table.Column<int>(type: "integer", nullable: false),
                    test_id = table.Column<string>(type: "text", nullable: false),
                    test_code = table.Column<string>(type: "text", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hr_id = table.Column<Guid>(type: "uuid", nullable: false),
                    test_mapping_id = table.Column<int>(type: "integer", nullable: true),
                    total_score = table.Column<double>(type: "double precision", nullable: false),
                    score_secured = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_results", x => x.id);
                    table.ForeignKey(
                        name: "FK_results_test_mappings_test_mapping_id",
                        column: x => x.test_mapping_id,
                        principalTable: "test_mappings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "verbal_mappings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    test_mapping_id = table.Column<int>(type: "integer", nullable: false),
                    verbal_code = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verbal_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_verbal_mappings_test_mappings_test_mapping_id",
                        column: x => x.test_mapping_id,
                        principalTable: "test_mappings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_interview_results",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    result_base_id = table.Column<int>(type: "integer", nullable: false),
                    ai_code = table.Column<string>(type: "text", nullable: false),
                    module_total_score = table.Column<double>(type: "double precision", nullable: false),
                    module_score_secured = table.Column<double>(type: "double precision", nullable: false),
                    questions = table.Column<List<string>>(type: "jsonb", nullable: false),
                    answers = table.Column<List<string>>(type: "jsonb", nullable: false),
                    correct_answers = table.Column<List<string>>(type: "jsonb", nullable: false),
                    correct = table.Column<int>(type: "integer", nullable: false),
                    wrong = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_interview_results", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_interview_results_results_result_base_id",
                        column: x => x.result_base_id,
                        principalTable: "results",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aptitude_results",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    result_base_id = table.Column<int>(type: "integer", nullable: false),
                    aptitude_code = table.Column<string>(type: "text", nullable: false),
                    module_total_score = table.Column<double>(type: "double precision", nullable: false),
                    module_score_secured = table.Column<double>(type: "double precision", nullable: false),
                    questions = table.Column<List<string>>(type: "jsonb", nullable: false),
                    user_answers = table.Column<List<string>>(type: "jsonb", nullable: false),
                    correct_answers = table.Column<List<string>>(type: "jsonb", nullable: false),
                    topics = table.Column<List<string>>(type: "jsonb", nullable: false),
                    correct = table.Column<int>(type: "integer", nullable: false),
                    incorrect = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aptitude_results", x => x.Id);
                    table.ForeignKey(
                        name: "FK_aptitude_results_results_result_base_id",
                        column: x => x.result_base_id,
                        principalTable: "results",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "coding_results",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    result_base_id = table.Column<int>(type: "integer", nullable: false),
                    coding_code = table.Column<string>(type: "text", nullable: false),
                    module_total_score = table.Column<double>(type: "double precision", nullable: false),
                    module_score_secured = table.Column<double>(type: "double precision", nullable: false),
                    testcase_totals = table.Column<List<int>>(type: "jsonb", nullable: false),
                    testcase_passed = table.Column<List<int>>(type: "jsonb", nullable: false),
                    answers = table.Column<List<string>>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_coding_results", x => x.Id);
                    table.ForeignKey(
                        name: "FK_coding_results_results_result_base_id",
                        column: x => x.result_base_id,
                        principalTable: "results",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "verbal_results",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    result_base_id = table.Column<int>(type: "integer", nullable: false),
                    verbal_code = table.Column<string>(type: "text", nullable: false),
                    module_total_score = table.Column<double>(type: "double precision", nullable: false),
                    module_score_secured = table.Column<double>(type: "double precision", nullable: false),
                    metrics = table.Column<Dictionary<string, double>>(type: "jsonb", nullable: false),
                    listening = table.Column<List<string>>(type: "jsonb", nullable: false),
                    speaking = table.Column<List<string>>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verbal_results", x => x.Id);
                    table.ForeignKey(
                        name: "FK_verbal_results_results_result_base_id",
                        column: x => x.result_base_id,
                        principalTable: "results",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_interview_mappings_test_mapping_id",
                table: "ai_interview_mappings",
                column: "test_mapping_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_interview_results_result_base_id",
                table: "ai_interview_results",
                column: "result_base_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_aptitude_mappings_test_mapping_id",
                table: "aptitude_mappings",
                column: "test_mapping_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_aptitude_results_result_base_id",
                table: "aptitude_results",
                column: "result_base_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_coding_mappings_test_mapping_id",
                table: "coding_mappings",
                column: "test_mapping_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_coding_results_result_base_id",
                table: "coding_results",
                column: "result_base_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_companies_user_id",
                table: "companies",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_company_infos_company_id",
                table: "company_infos",
                column: "company_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_credit_points_module",
                table: "credit_points",
                column: "module",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_hrs_company_id",
                table: "hrs",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_hrs_email",
                table: "hrs",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_identity_verifications_user_id",
                table: "identity_verifications",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_results_test_mapping_id",
                table: "results",
                column: "test_mapping_id");

            migrationBuilder.CreateIndex(
                name: "IX_test_infos_company_id",
                table: "test_infos",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_test_mappings_test_id",
                table: "test_mappings",
                column: "test_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_profiles_user_id",
                table: "user_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_verbal_mappings_test_mapping_id",
                table: "verbal_mappings",
                column: "test_mapping_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_verbal_results_result_base_id",
                table: "verbal_results",
                column: "result_base_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_interview_mappings");

            migrationBuilder.DropTable(
                name: "ai_interview_results");

            migrationBuilder.DropTable(
                name: "aptitude_mappings");

            migrationBuilder.DropTable(
                name: "aptitude_results");

            migrationBuilder.DropTable(
                name: "coding_mappings");

            migrationBuilder.DropTable(
                name: "coding_results");

            migrationBuilder.DropTable(
                name: "company_infos");

            migrationBuilder.DropTable(
                name: "credit_points");

            migrationBuilder.DropTable(
                name: "hrs");

            migrationBuilder.DropTable(
                name: "identity_verifications");

            migrationBuilder.DropTable(
                name: "user_profiles");

            migrationBuilder.DropTable(
                name: "verbal_mappings");

            migrationBuilder.DropTable(
                name: "verbal_results");

            migrationBuilder.DropTable(
                name: "results");

            migrationBuilder.DropTable(
                name: "test_mappings");

            migrationBuilder.DropTable(
                name: "test_infos");

            migrationBuilder.DropTable(
                name: "companies");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
