FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /workspace

COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./

RUN chmod +x gradlew

COPY src src

RUN ./gradlew clean bootJar -x test --no-daemon && \
    JAR_FILE=$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | head -n 1) && \
    test -n "$JAR_FILE" && \
    cp "$JAR_FILE" app.jar


FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

RUN groupadd --system quietpath && \
    useradd --system --gid quietpath --no-create-home quietpath

COPY --from=builder /workspace/app.jar app.jar

USER quietpath

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
