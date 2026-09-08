using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Knitnet.UserApi.Migrations
{
    /// <inheritdoc />
    public partial class FixIdentityVerificationColumnTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The identity_verifications table may have been created by the Python
            // verification module with 'text' column types for 'id' and 'user_id'.
            // EF Core expects these to be 'integer'. This migration corrects the mismatch.

            // First, drop the FK constraint that references user_id (if it exists)
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_identity_verifications_users_user_id'
                        AND table_name = 'identity_verifications'
                    ) THEN
                        ALTER TABLE identity_verifications
                            DROP CONSTRAINT ""FK_identity_verifications_users_user_id"";
                    END IF;
                END $$;
            ");

            // Convert 'id' column from text to integer (if it is currently text)
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'identity_verifications'
                        AND column_name = 'id'
                        AND data_type = 'text'
                    ) THEN
                        ALTER TABLE identity_verifications
                            ALTER COLUMN id TYPE integer USING id::integer;
                    END IF;
                END $$;
            ");

            // Convert 'user_id' column from text to integer (if it is currently text)
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'identity_verifications'
                        AND column_name = 'user_id'
                        AND data_type = 'text'
                    ) THEN
                        ALTER TABLE identity_verifications
                            ALTER COLUMN user_id TYPE integer USING user_id::integer;
                    END IF;
                END $$;
            ");

            // Re-add the identity sequence on 'id' if it's missing
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    -- Only add sequence if not already set
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_sequences
                        WHERE schemaname = 'public'
                        AND sequencename LIKE 'identity_verifications_id_seq%'
                    ) THEN
                        CREATE SEQUENCE IF NOT EXISTS identity_verifications_id_seq;
                        ALTER TABLE identity_verifications
                            ALTER COLUMN id SET DEFAULT nextval('identity_verifications_id_seq');
                        SELECT setval('identity_verifications_id_seq', COALESCE((SELECT MAX(id) FROM identity_verifications), 0) + 1, false);
                    END IF;
                END $$;
            ");

            // Re-add the FK constraint from identity_verifications.user_id → users.id
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_identity_verifications_users_user_id'
                        AND table_name = 'identity_verifications'
                    ) THEN
                        ALTER TABLE identity_verifications
                            ADD CONSTRAINT ""FK_identity_verifications_users_user_id""
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert id and user_id back to text (not typically needed, but included for completeness)
            migrationBuilder.Sql(@"
                ALTER TABLE identity_verifications
                    DROP CONSTRAINT IF EXISTS ""FK_identity_verifications_users_user_id"";
                ALTER TABLE identity_verifications
                    ALTER COLUMN id TYPE text USING id::text;
                ALTER TABLE identity_verifications
                    ALTER COLUMN user_id TYPE text USING user_id::text;
            ");
        }
    }
}
