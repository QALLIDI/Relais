# syntax=docker/dockerfile:1
# Image commune à tous les services : docker build --build-arg SERVICE=candidat-service ./backend
FROM maven:3.9-eclipse-temurin-21 AS build
ARG SERVICE
WORKDIR /src
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -pl ${SERVICE} -am package -DskipTests

FROM eclipse-temurin:21-jre
ARG SERVICE
RUN useradd --system --uid 1001 app && mkdir -p /data/cv && chown app /data/cv
WORKDIR /app
COPY --from=build /src/${SERVICE}/target/${SERVICE}.jar app.jar
USER app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
