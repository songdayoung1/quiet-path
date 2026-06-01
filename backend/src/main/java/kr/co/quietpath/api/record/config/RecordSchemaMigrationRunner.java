package kr.co.quietpath.api.record.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class RecordSchemaMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        String schemaName = jdbcTemplate.queryForObject("select database()", String.class);
        if (!StringUtils.hasText(schemaName)) {
            log.warn("Skip record schema migration because current schema name is empty");
            return;
        }

        if (!hasIndex(schemaName, "records", "idx_user_record_date_id")) {
            jdbcTemplate.execute("ALTER TABLE records ADD INDEX idx_user_record_date_id (user_id, record_date, id)");
            log.info("Added supporting index records.idx_user_record_date_id");
        }

        if (hasIndex(schemaName, "records", "uk_user_date")) {
            jdbcTemplate.execute("ALTER TABLE records DROP INDEX uk_user_date");
            log.info("Dropped legacy unique index records.uk_user_date");
        }

        if (!hasIndex(schemaName, "records", "uk_path_date")) {
            jdbcTemplate.execute("ALTER TABLE records ADD CONSTRAINT uk_path_date UNIQUE (path_id, record_date)");
            log.info("Added unique index records.uk_path_date");
        }
    }

    private boolean hasIndex(String schemaName, String tableName, String indexName) {
        Integer count = jdbcTemplate.queryForObject(
            """
                select count(1)
                from information_schema.statistics
                where table_schema = ?
                  and table_name = ?
                  and index_name = ?
                """,
            Integer.class,
            schemaName,
            tableName,
            indexName
        );
        return count != null && count > 0;
    }
}
