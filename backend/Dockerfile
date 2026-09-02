# syntax=docker/dockerfile:1
#
# Runtime image for the Volt API. The boot jar is built by Gradle on the host/CI
# (NOT inside the image) and copied in:
#
#   ./gradlew bootJar && docker compose up --build
#
# Building outside the container keeps the image small (no build tooling) and avoids
# downloading dependencies during `docker build` — which fails behind TLS-intercepting
# corporate proxies. CI runs the same two steps.
FROM amazoncorretto:21-alpine AS runtime
WORKDIR /app
RUN addgroup -S volt && adduser -S -G volt volt \
    && mkdir -p /app/uploads && chown -R volt:volt /app
COPY build/libs/*.jar /app/app.jar
USER volt
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=postgres
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
