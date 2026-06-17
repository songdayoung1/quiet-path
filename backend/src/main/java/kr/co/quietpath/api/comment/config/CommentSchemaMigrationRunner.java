package kr.co.quietpath.api.comment.config;

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
public class CommentSchemaMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        String schemaName = jdbcTemplate.queryForObject("select database()", String.class);
        if (!StringUtils.hasText(schemaName)) {
            log.warn("Skip comment schema migration because current schema name is empty");
            return;
        }

        if (hasIndex(schemaName, "comments", "idx_comment_target_created")) {
            jdbcTemplate.execute("ALTER TABLE comments DROP INDEX idx_comment_target_created");
            log.info("Dropped legacy index comments.idx_comment_target_created");
        }

        if (hasColumn(schemaName, "comments", "target_type")) {
            jdbcTemplate.execute("ALTER TABLE comments DROP COLUMN target_type");
            log.info("Dropped legacy column comments.target_type");
        }

        if (hasColumn(schemaName, "comments", "target_id")) {
            jdbcTemplate.execute("ALTER TABLE comments DROP COLUMN target_id");
            log.info("Dropped legacy column comments.target_id");
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

    private boolean hasColumn(String schemaName, String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
            """
                select count(1)
                from information_schema.columns
                where table_schema = ?
                  and table_name = ?
                  and column_name = ?
                """,
            Integer.class,
            schemaName,
            tableName,
            columnName
        );
        return count != null && count > 0;
    }
}
