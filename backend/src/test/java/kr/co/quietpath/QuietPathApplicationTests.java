package kr.co.quietpath;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.SpringBootTest;

@Disabled("로컬 데이터소스 설정이 필요한 통합 스모크 테스트")
@SpringBootTest(properties = {
	"spring.datasource.url=jdbc:h2:mem:testdb;MODE=MySQL;DB_CLOSE_DELAY=-1",
	"spring.datasource.driver-class-name=org.h2.Driver",
	"spring.datasource.username=sa",
	"spring.datasource.password=",
	"spring.jpa.hibernate.ddl-auto=none"
})
class QuietPathApplicationTests {

	@Test
	void contextLoads() {
	}

}
